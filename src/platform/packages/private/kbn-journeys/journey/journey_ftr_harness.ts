/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import Url from 'url';
import { inspect, format } from 'util';
import { setTimeout as setTimer } from 'timers/promises';
import * as Rx from 'rxjs';
import apmNode from 'elastic-apm-node';
import type { ApmBase } from '@elastic/apm-rum';
import playwright, { ChromiumBrowser, Page, BrowserContext, CDPSession, Request } from 'playwright';
import { asyncMap, asyncForEach } from '@kbn/std';
import { ToolingLog } from '@kbn/tooling-log';
import { Config } from '@kbn/test';
import {
  ELASTIC_HTTP_VERSION_HEADER,
  X_ELASTIC_INTERNAL_ORIGIN_REQUEST,
} from '@kbn/core-http-common';

import { AxiosError } from 'axios';
import { Auth, Es, EsArchiver, KibanaServer, Retry } from '../services';
import { getInputDelays } from '../services/input_delays';
import { KibanaUrl } from '../services/kibana_url';

import type { Step, AnyStep } from './journey';
import type { JourneyConfig } from './journey_config';
import { JourneyScreenshots } from './journey_screenshots';
import { getNewPageObject } from '../services/page';
import { getSynthtraceClient } from '../services/synthtrace';

type WindowWithApmContext = Window & {
  elasticApm?: ApmBase;
  traceIdOverrideListenerAttached?: boolean;
  journeyTraceId?: string;
  journeyParentId?: string;
};

export class JourneyFtrHarness {
  private readonly screenshots: JourneyScreenshots;
  private readonly kbnUrl: KibanaUrl;

  constructor(
    private readonly log: ToolingLog,
    private readonly config: Config,
    private readonly esArchiver: EsArchiver,
    private readonly kibanaServer: KibanaServer,
    private readonly es: Es,
    private readonly retry: Retry,
    private readonly auth: Auth,
    private readonly journeyConfig: JourneyConfig<any>
  ) {
    this.screenshots = new JourneyScreenshots(this.journeyConfig.getName());
    this.kbnUrl = new KibanaUrl(
      new URL(
        Url.format({
          protocol: this.config.get('servers.kibana.protocol'),
          hostname: this.config.get('servers.kibana.hostname'),
          port: this.config.get('servers.kibana.port'),
        })
      )
    );
  }

  private browser: ChromiumBrowser | undefined;
  private page: Page | undefined;
  private client: CDPSession | undefined;
  private context: BrowserContext | undefined;
  private currentSpanStack: Array<apmNode.Span | null> = [];
  private currentTransaction: apmNode.Transaction | undefined | null = undefined;

  private pageTeardown$ = new Rx.Subject<Page>();
  private telemetryTrackerSubs = new Map<Page, Rx.Subscription>();

  private apm: apmNode.Agent | null = null;

  // journey can be run to collect EBT/APM metrics or just as a functional test
  // TEST_INGEST_ES_DATA is defined via scripts/run_perfomance.js run only
  private readonly isPerformanceRun = !!process.env.TEST_PERFORMANCE_PHASE;
  private readonly shouldIngestEsData = process.env.TEST_INGEST_ES_DATA === 'true' || false;

  // Update the Telemetry and APM global labels to link traces with journey
  private async updateTelemetryAndAPMLabels(labels: { [k: string]: string }) {
    this.log.info(`Updating telemetry & APM labels: ${JSON.stringify(labels)}`);

    try {
      await this.kibanaServer.request({
        path: '/internal/core/_settings',
        method: 'PUT',
        headers: {
          [ELASTIC_HTTP_VERSION_HEADER]: '1',
          [X_ELASTIC_INTERNAL_ORIGIN_REQUEST]: 'ftr',
        },
        body: { telemetry: { labels } },
      });
    } catch (error) {
      const statusCode = (error as AxiosError).response?.status;
      if (statusCode === 404) {
        throw new Error(
          `Failed to update labels, supported Kibana version is 8.11.0+ and must be started with "coreApp.allowDynamicConfigOverrides:true"`
        );
      } else throw error;
    }
  }

  private async setupApm() {
    const kbnTestServerEnv = this.config.get(`kbnTestServer.env`);

    const journeyLabels: { [k: string]: string } = Object.fromEntries(
      kbnTestServerEnv.ELASTIC_APM_GLOBAL_LABELS.split(',').map((kv: string) => kv.split('='))
    );

    // Update labels before start for consistency b/w APM services
    await this.updateTelemetryAndAPMLabels(journeyLabels);

    this.apm = apmNode.start({
      serviceName: 'functional test runner',
      environment: process.env.CI ? 'ci' : 'development',
      active: kbnTestServerEnv.ELASTIC_APM_ACTIVE !== 'false',
      serverUrl: kbnTestServerEnv.ELASTIC_APM_SERVER_URL,
      secretToken: kbnTestServerEnv.ELASTIC_APM_SECRET_TOKEN,
      globalLabels: kbnTestServerEnv.ELASTIC_APM_GLOBAL_LABELS,
      transactionSampleRate: kbnTestServerEnv.ELASTIC_APM_TRANSACTION_SAMPLE_RATE,
      logger: {
        warn: (...args: any[]) => {
          this.log.warning('APM WARN', ...args);
        },
        info: (...args: any[]) => {
          this.log.info('APM INFO', ...args);
        },
        fatal: (...args: any[]) => {
          this.log.error(format('APM FATAL', ...args));
        },
        error: (...args: any[]) => {
          this.log.error(format('APM ERROR', ...args));
        },
        debug: (...args: any[]) => {
          this.log.debug('APM DEBUG', ...args);
        },
        trace: (...args: any[]) => {
          this.log.verbose('APM TRACE', ...args);
        },
      },
    });

    if (this.currentTransaction) {
      throw new Error(`Transaction exist, end prev transaction ${this.currentTransaction?.name}`);
    }

    this.currentTransaction = this.apm?.startTransaction(
      `Journey: ${this.journeyConfig.getName()}`,
      'performance'
    );
  }

  private async setupBrowserAndPage() {
    const browser = await this.getBrowserInstance();
    const browserContextArgs = this.auth.isCloud() ? {} : { bypassCSP: true };
    this.context = await browser.newContext({ ...browserContextArgs, ignoreHTTPSErrors: true });

    if (this.journeyConfig.shouldAutoLogin()) {
      const cookie = await this.auth.login();
      await this.context.addCookies([cookie]);
    }

    this.page = await this.context.newPage();

    await this.interceptBrowserRequests(this.page);

    const initializeApmInitListener = async () => {
      await this.page?.evaluate(() => {
        const win = window as WindowWithApmContext;

        const attachTraceIdOverrideListener = () => {
          if (win.traceIdOverrideListenerAttached) {
            return;
          }
          win.traceIdOverrideListenerAttached = true;
          win.elasticApm!.observe('transaction:start', (tx) => {
            // private properties, bit of a hack
            // @ts-expect-error
            tx.traceId = win.journeyTraceId || tx.traceId;
            // @ts-expect-error
            tx.parentId = win.journeyParentId || tx.parentId;
          });
        };

        if (win.elasticApm) {
          attachTraceIdOverrideListener();
        } else {
          // attach trace listener as soon as elasticApm API is available
          let originalValue: any;

          Object.defineProperty(window, 'elasticApm', {
            get() {
              return originalValue;
            },
            set(newValue) {
              originalValue = newValue;
              attachTraceIdOverrideListener();
            },
            configurable: true,
            enumerable: true,
          });
        }
      });
    };

    this.page.on('framenavigated', () => {
      initializeApmInitListener();
    });

    await initializeApmInitListener();

    if (!process.env.NO_BROWSER_LOG) {
      this.page.on('console', this.onConsoleEvent);
    }

    await this.sendCDPCommands(this.context, this.page);

    this.trackTelemetryRequests(this.page);
  }

  private async runSynthtrace() {
    const config = this.journeyConfig.getSynthtraceConfig();
    if (config) {
      const client = await getSynthtraceClient(config.type, {
        log: this.log,
        es: this.es,
        auth: this.auth,
        kbnUrl: this.kbnUrl,
      });
      const generator = config.generator(config.options);
      await client.index(generator);
    }
  }

  /**
   * onSetup is part of high level 'before' hook and does the following sequentially:
   * 1. Start browser
   * 2. Load test data (opt-in)
   * 3. Run BeforeSteps (opt-in)
   * 4. Setup APM
   */
  private async onSetup() {
    // We start browser and init page in the first place
    await this.setupBrowserAndPage();

    // We allow opt-in beforeSteps hook to manage Kibana/ES after start, install integrations, etc.
    await this.journeyConfig.getBeforeStepsFn(this.getCtx());

    /**
     * Loading test data, optionally but following the order:
     * 1. Synthtrace client
     * 2. ES archives
     * 3. Kbn archives (Saved objects)
     */

    // To insure we ingest data with synthtrace only once during performance run
    if (!this.isPerformanceRun || this.shouldIngestEsData) {
      await this.runSynthtrace();
    }

    await Promise.all([
      asyncForEach(this.journeyConfig.getEsArchives(), async (esArchive) => {
        if (this.isPerformanceRun) {
          //
          /**
           * During performance run we ingest data to ES before WARMUP phase, and avoid re-indexing
           * before TEST phase by insuring index already exists
           */
          await this.esArchiver.loadIfNeeded(esArchive);
        } else {
          await this.esArchiver.load(esArchive);
        }
      }),
      asyncForEach(this.journeyConfig.getKbnArchives(), async (kbnArchive) => {
        await this.kibanaServer.importExport.load(kbnArchive);
      }),
    ]);

    // It is important that we start the APM transaction after we open the browser and all the test data is loaded
    // so that the scalability data extractor can focus on just the APM data produced by Kibana running under test.
    await this.setupApm();
  }

  private async tearDownBrowserAndPage() {
    if (this.page) {
      const telemetryTracker = this.telemetryTrackerSubs.get(this.page);
      this.telemetryTrackerSubs.delete(this.page);

      if (telemetryTracker && !telemetryTracker.closed) {
        this.log.info(`Waiting for telemetry requests, including starting within next 3 secs`);
        this.pageTeardown$.next(this.page);
        await new Promise<void>((resolve) => telemetryTracker.add(resolve));
      }

      this.log.info('destroying page');
      await this.client?.detach();
      await this.page.close();
      await this.context?.close();
    }

    if (this.browser) {
      this.log.info('closing browser');
      await this.browser.close();
    }
  }

  private async teardownApm() {
    if (!this.apm) {
      return;
    }

    if (this.currentTransaction) {
      this.currentTransaction.end('Success');
      this.currentTransaction = undefined;
    }

    const apmStarted = this.apm.isStarted();
    // @ts-expect-error
    const apmActive = apmStarted && this.apm._conf.active;

    if (!apmActive) {
      this.log.warning('APM is not active');
      return;
    }

    this.log.info('Flushing APM');
    await new Promise<void>((resolve) => this.apm?.flush(() => resolve()));
    // wait for the HTTP request that apm.flush() starts, which we
    // can't track but hope it is started within 3 seconds, node will stay
    // alive for active requests
    // https://github.com/elastic/apm-agent-nodejs/issues/2088
    await setTimer(3000);
  }

  private async onTeardown() {
    await this.tearDownBrowserAndPage();
    // It is important that we complete the APM transaction after we close the browser and before we start
    // unloading the test data so that the scalability data extractor can focus on just the APM data produced
    // by Kibana running under test.
    await this.teardownApm();
    await Promise.all([
      asyncForEach(this.journeyConfig.getEsArchives(), async (esArchive) => {
        /**
         * Keep ES data after WARMUP phase to avoid re-indexing
         */
        if (!this.isPerformanceRun) {
          await this.esArchiver.unload(esArchive);
        }
      }),
      asyncForEach(this.journeyConfig.getKbnArchives(), async (kbnArchive) => {
        await this.kibanaServer.importExport.unload(kbnArchive);
      }),
    ]);
  }

  private async takeScreenshots(page: Page) {
    let screenshot;
    let fs;
    // screenshots taking might crash the browser
    try {
      screenshot = await page.screenshot({ animations: 'disabled' });
      fs = await page.screenshot({ animations: 'disabled', fullPage: true });
    } catch (e) {
      if (!screenshot) {
        this.log.error(`Failed to take screenshot of the visible viewport: ${e.message}`);
      } else if (screenshot && !fs) {
        this.log.error(`Failed to take screenshot of the full scrollable page: ${e.message}`);
      } else {
        this.log.error(`Unknown error on taking screenshots`);
      }
    }

    return { screenshot, fs };
  }

  private async onStepSuccess(step: AnyStep) {
    if (!this.page) {
      return;
    }

    if (this.journeyConfig.takeScreenshotOnSuccess()) {
      const { screenshot, fs } = await this.takeScreenshots(this.page);
      if (screenshot && fs) {
        await this.screenshots.addSuccess(step, screenshot, fs);
      }
    }
  }

  private async onStepError(step: AnyStep, err: Error) {
    if (this.currentTransaction) {
      this.currentTransaction.end(`Failure ${err.message}`);
      this.currentTransaction = undefined;
    }

    if (this.page) {
      const { screenshot, fs } = await this.takeScreenshots(this.page);
      if (screenshot && fs) {
        await this.screenshots.addError(step, screenshot, fs);
      }
    }
  }

  private async withSpan<T>(name: string, type: string | undefined, block: () => Promise<T>) {
    if (!this.currentTransaction) {
      return await block();
    }

    const span = this.currentTransaction.startSpan(name, type ?? null);

    if (!span) {
      return await block();
    }

    try {
      this.currentSpanStack.unshift(span);
      const result = await block();
      span.setOutcome('success');
      span.end();
      return result;
    } catch (error) {
      span.setOutcome('failure');
      span.end();
      throw error;
    } finally {
      if (span !== this.currentSpanStack.shift()) {
        // eslint-disable-next-line no-unsafe-finally
        throw new Error('span stack mismatch');
      }
    }
  }

  private getCurrentSpanOrTransaction() {
    return this.currentSpanStack.length ? this.currentSpanStack[0] : this.currentTransaction;
  }

  private getCurrentTraceparent() {
    return this.getCurrentSpanOrTransaction()?.traceparent;
  }

  private async getBrowserInstance() {
    if (this.browser) {
      return this.browser;
    }
    return await this.withSpan('Browser creation', 'setup', async () => {
      const headless = !!(process.env.TEST_BROWSER_HEADLESS || process.env.CI);
      this.browser = await playwright.chromium.launch({ headless, timeout: 60_000 });
      return this.browser;
    });
  }

  private async sendCDPCommands(context: BrowserContext, page: Page) {
    const client = await context.newCDPSession(page);

    await client.send('Network.clearBrowserCache');
    await client.send('Network.setCacheDisabled', { cacheDisabled: true });
    await client.send('Network.emulateNetworkConditions', {
      latency: 100,
      downloadThroughput: 750_000,
      uploadThroughput: 750_000,
      offline: false,
    });

    return client;
  }

  private telemetryTrackerCount = 0;

  private trackTelemetryRequests(page: Page) {
    const requestSuccess$ = Rx.fromEvent(
      page,
      'requestfinished'
    ) as Rx.Observable<playwright.Request>;
    const request$ = (Rx.fromEvent(page, 'request') as Rx.Observable<playwright.Request>).pipe(
      Rx.takeUntil(
        this.pageTeardown$.pipe(
          Rx.first((p) => p === page),
          Rx.delay(3000)
        )
      ),
      Rx.mergeMap((request: Request) => {
        if (!request.url().includes('telemetry-staging.elastic.co')) {
          return Rx.EMPTY;
        }

        const id = ++this.telemetryTrackerCount;
        this.log.info(`Waiting for telemetry request #${id} to complete`);
        return Rx.of(requestSuccess$).pipe(
          Rx.timeout(60_000),
          Rx.catchError((error) => {
            if (error instanceof Error && error.name === 'TimeoutError') {
              this.log.error(`Timeout error occurred: ${error.message}`);
            }
            // Rethrow the error if it's not a TimeoutError
            return Rx.throwError(() => new Error(error));
          }),
          Rx.tap({
            complete: () => this.log.info(`Telemetry request #${id} complete`),
            error: (err) => this.log.error(`Telemetry request was not processed: ${err.message}`),
          })
        );
      })
    );

    this.telemetryTrackerSubs.set(page, request$.subscribe());
  }

  private async interceptBrowserRequests(page: Page) {
    await page.route('**', async (route, request) => {
      const headers = await request.allHeaders();
      const traceparent = this.getCurrentTraceparent();
      if (traceparent && request.isNavigationRequest()) {
        await route.continue({ headers: { traceparent, ...headers } });
      } else {
        await route.continue();
      }
    });
  }

  #_ctx?: Record<string, unknown>;
  private getCtx() {
    if (this.#_ctx) {
      return this.#_ctx;
    }

    const page = this.page;

    if (!page) {
      throw new Error('performance service is not properly initialized');
    }

    const isServerlessProject = !!this.config.get('serverless');
    const kibanaPage = getNewPageObject(isServerlessProject, page, this.log, this.retry);

    this.#_ctx = this.journeyConfig.getExtendedStepCtx({
      kibanaPage,
      page,
      log: this.log,
      inputDelays: getInputDelays(),
      kbnUrl: new KibanaUrl(
        new URL(
          Url.format({
            protocol: this.config.get('servers.kibana.protocol'),
            hostname: this.config.get('servers.kibana.hostname'),
            port: this.config.get('servers.kibana.port'),
          })
        )
      ),
      kibanaServer: this.kibanaServer,
      es: this.es,
      retry: this.retry,
      auth: this.auth,
    });

    return this.#_ctx;
  }

  public initMochaSuite(steps: Array<Step<any>>) {
    const journeyName = this.journeyConfig.getName();

    (this.journeyConfig.isSkipped() ? describe.skip : describe)(`Journey[${journeyName}]`, () => {
      before(async () => await this.onSetup());
      after(async () => await this.onTeardown());

      for (const step of steps) {
        it(step.name, async () => {
          await this.withSpan(`step: ${step.name}`, 'step', async () => {
            await this.page?.evaluate(
              ([traceId, parentId]) => {
                const win = window as WindowWithApmContext;
                win.journeyTraceId = traceId;
                win.journeyParentId = parentId;
              },
              [
                this.apm?.currentTraceIds['trace.id'],
                this.apm?.currentTraceIds['span.id'] || this.apm?.currentTraceIds['transaction.id'],
              ]
            );

            try {
              await step.fn(this.getCtx());
              await this.onStepSuccess(step);
            } catch (e) {
              const error = new Error(`Step [${step.name}] failed: ${e.message}`);
              error.stack = e.stack;
              await this.onStepError(step, error);
              throw error; // Rethrow error if step fails otherwise it is silently passing
            }
          });
        });
      }
    });
  }

  private onConsoleEvent = async (message: playwright.ConsoleMessage) => {
    try {
      const { url, lineNumber, columnNumber } = message.location();

      if (
        url.includes('kbn-ui-shared-deps-npm.dll.js') ||
        url.includes('kbn-ui-shared-deps-src.js')
      ) {
        // ignore messages from kbn-ui-shared-deps-npm.dll.js & kbn-ui-shared-deps-src.js
        return;
      }

      const location = `${url}:${lineNumber}:${columnNumber}`;

      const args = await asyncMap(message.args(), (handle) => handle.jsonValue());
      const text = args.length
        ? args.map((arg) => (typeof arg === 'string' ? arg : inspect(arg, false, null))).join(' ')
        : message.text();

      if (text.includes(`Unrecognized feature: 'web-share'`)) {
        // ignore Error with Permissions-Policy header: Unrecognized feature: 'web-share'
        return;
      }

      if (
        url.includes('core.entry.js') &&
        args.length > 1 &&
        !('performance_metric' === args[1]?.ebt_event?.event_type)
      ) {
        // ignore events like "click", log to console only 'event_type: performance_metric'
        return;
      }

      const type = message.type();
      const method = type === 'debug' ? type : type === 'warning' ? 'error' : 'info';
      const name = type === 'warning' ? 'error' : 'log';
      this.log[method](`[console.${name}] @ ${location}:\n${text}`);
    } catch (error) {
      const dbg = inspect(message);
      this.log.error(
        `Error interpreting browser console.log:\nerror:${error.message}\nmessage:\n${dbg}`
      );
    }
  };
}
