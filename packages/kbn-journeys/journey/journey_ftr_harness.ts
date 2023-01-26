/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import Url from 'url';
import { inspect, format } from 'util';
import { setTimeout } from 'timers/promises';

import * as Rx from 'rxjs';
import apmNode from 'elastic-apm-node';
import playwright, { ChromiumBrowser, Page, BrowserContext, CDPSession, Request } from 'playwright';
import { asyncMap, asyncForEach } from '@kbn/std';
import { ToolingLog } from '@kbn/tooling-log';
import { Config } from '@kbn/test';
import { EsArchiver, KibanaServer } from '@kbn/ftr-common-functional-services';

import { Auth } from '../services/auth';
import { getInputDelays } from '../services/input_delays';
import { KibanaUrl } from '../services/kibana_url';

import type { Step, AnyStep } from './journey';
import type { JourneyConfig } from './journey_config';
import { JourneyScreenshots } from './journey_screenshots';

export class JourneyFtrHarness {
  private readonly screenshots: JourneyScreenshots;

  constructor(
    private readonly log: ToolingLog,
    private readonly config: Config,
    private readonly esArchiver: EsArchiver,
    private readonly kibanaServer: KibanaServer,
    private readonly auth: Auth,
    private readonly journeyConfig: JourneyConfig<any>
  ) {
    this.screenshots = new JourneyScreenshots(this.journeyConfig.getName());
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

  private async setupApm() {
    const kbnTestServerEnv = this.config.get(`kbnTestServer.env`);

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
    this.context = await browser.newContext({ bypassCSP: true });

    if (this.journeyConfig.shouldAutoLogin()) {
      const cookie = await this.auth.login({ username: 'elastic', password: 'changeme' });
      await this.context.addCookies([cookie]);
    }

    this.page = await this.context.newPage();

    if (!process.env.NO_BROWSER_LOG) {
      this.page.on('console', this.onConsoleEvent);
    }

    await this.sendCDPCommands(this.context, this.page);

    this.trackTelemetryRequests(this.page);
    await this.interceptBrowserRequests(this.page);
  }

  private async onSetup() {
    await Promise.all([
      this.setupBrowserAndPage(),
      asyncForEach(this.journeyConfig.getEsArchives(), async (esArchive) => {
        await this.esArchiver.load(esArchive);
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
    await setTimeout(3000);
  }

  private async onTeardown() {
    await this.tearDownBrowserAndPage();
    // It is important that we complete the APM transaction after we close the browser and before we start
    // unloading the test data so that the scalability data extractor can focus on just the APM data produced
    // by Kibana running under test.
    await this.teardownApm();
    await Promise.all([
      asyncForEach(this.journeyConfig.getEsArchives(), async (esArchive) => {
        await this.esArchiver.unload(esArchive);
      }),
      asyncForEach(this.journeyConfig.getKbnArchives(), async (kbnArchive) => {
        await this.kibanaServer.importExport.unload(kbnArchive);
      }),
    ]);
  }

  private async onStepSuccess(step: AnyStep) {
    if (!this.page) {
      return;
    }

    const [screenshot, fs] = await Promise.all([
      this.page.screenshot(),
      this.page.screenshot({ fullPage: true }),
    ]);

    await this.screenshots.addSuccess(step, screenshot, fs);
  }

  private async onStepError(step: AnyStep, err: Error) {
    if (this.currentTransaction) {
      this.currentTransaction.end(`Failure ${err.message}`);
      this.currentTransaction = undefined;
    }

    if (this.page) {
      const [screenshot, fs] = await Promise.all([
        this.page.screenshot(),
        this.page.screenshot({ fullPage: true }),
      ]);

      await this.screenshots.addError(step, screenshot, fs);
    }
  }

  private async withSpan<T>(name: string, type: string | undefined, block: () => Promise<T>) {
    if (!this.currentTransaction) {
      return await block();
    }

    const span = this.apm?.startSpan(name, type ?? null, {
      childOf: this.currentTransaction,
    });
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

  private getCurrentTraceparent() {
    return (this.currentSpanStack.length ? this.currentSpanStack[0] : this.currentTransaction)
      ?.traceparent;
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
    const id = ++this.telemetryTrackerCount;

    const requestFailure$ = Rx.fromEvent<Request>(page, 'requestfailed');
    const requestSuccess$ = Rx.fromEvent<Request>(page, 'requestfinished');
    const request$ = Rx.fromEvent<Request>(page, 'request').pipe(
      Rx.takeUntil(
        this.pageTeardown$.pipe(
          Rx.first((p) => p === page),
          Rx.delay(3000)
          // If EBT client buffers:
          // Rx.mergeMap(async () => {
          //  await page.waitForFunction(() => {
          //    // return window.kibana_ebt_client.buffer_size == 0
          //  });
          // })
        )
      ),
      Rx.mergeMap((request) => {
        if (!request.url().includes('telemetry-staging.elastic.co')) {
          return Rx.EMPTY;
        }

        this.log.debug(`Waiting for telemetry request #${id} to complete`);
        return Rx.merge(requestFailure$, requestSuccess$).pipe(
          Rx.first((r) => r === request),
          Rx.tap({
            complete: () => this.log.debug(`Telemetry request #${id} complete`),
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

    this.#_ctx = this.journeyConfig.getExtendedStepCtx({
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
      const location = `${url}:${lineNumber}:${columnNumber}`;

      const args = await asyncMap(message.args(), (handle) => handle.jsonValue());
      const text = args.length
        ? args.map((arg) => (typeof arg === 'string' ? arg : inspect(arg, false, null))).join(' ')
        : message.text();

      if (
        url.includes('kbn-ui-shared-deps-npm.dll.js') &&
        text.includes('moment construction falls')
      ) {
        // ignore errors from moment about constructing dates with invalid formats
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
