/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { ApmBase, AgentConfigOptions, Transaction } from '@elastic/apm-rum';
import { modifyUrl } from '@kbn/std';
import { CachedResourceObserver } from './apm_resource_counter';
import type { InternalApplicationStart } from './application';
import { ExecutionContextStart } from './execution_context';

/** "GET protocol://hostname:port/pathname" */
const HTTP_REQUEST_TRANSACTION_NAME_REGEX =
  /^(GET|POST|PUT|HEAD|PATCH|DELETE|OPTIONS|CONNECT|TRACE)\s(.*)$/;

/**
 * This is the entry point used to boot the frontend when serving a application
 * that lives in the Kibana Platform.
 */

interface ApmConfig extends AgentConfigOptions {
  // Kibana-specific config settings:
  globalLabels?: Record<string, string>;
}

interface StartDeps {
  application: InternalApplicationStart;
  executionContext: ExecutionContextStart;
}

export class ApmSystem {
  private readonly enabled: boolean;
  private pageLoadTransaction?: Transaction;
  private resourceObserver: CachedResourceObserver;
  private apm?: ApmBase;

  /**
   * `apmConfig` would be populated with relevant APM RUM agent
   * configuration if server is started with elastic.apm.* config.
   */
  constructor(private readonly apmConfig?: ApmConfig, private readonly basePath = '') {
    this.enabled = apmConfig != null && !!apmConfig.active;
    this.resourceObserver = new CachedResourceObserver();
  }

  async setup() {
    if (!this.enabled) return;
    const { init, apm } = await import('@elastic/apm-rum');
    this.apm = apm;
    const { globalLabels, ...apmConfig } = this.apmConfig!;
    if (globalLabels) {
      apm.addLabels(globalLabels);
    }

    this.addHttpRequestNormalization(apm);

    init(apmConfig);
    // hold page load transaction blocks a transaction implicitly created by init.
    this.holdPageLoadTransaction(apm);
  }

  async start(start?: StartDeps) {
    if (!this.enabled || !start) return;

    this.markPageLoadStart();

    start.executionContext.context$.subscribe((c) => {
      // We're using labels because we want the context to be indexed
      // https://www.elastic.co/guide/en/apm/get-started/current/metadata.html
      const apmContext = start.executionContext.getAsLabels();
      this.apm?.addLabels(apmContext);
    });

    // TODO: Start a new transaction every page change instead of every app change.

    /**
     * Register listeners for navigation changes and capture them as
     * route-change transactions after Kibana app is bootstrapped
     */
    start.application.currentAppId$.subscribe((appId) => {
      if (appId && this.apm) {
        this.closePageLoadTransaction();
        this.apm.startTransaction(appId, 'app-change', {
          managed: true,
          canReuse: true,
        });
      }
    });
  }

  /* Hold the page load transaction open, until all resources actually finish loading */
  private holdPageLoadTransaction(apm: ApmBase) {
    const transaction = apm.getCurrentTransaction();

    // Keep the page load transaction open until all resources finished loading
    if (transaction && transaction.type === 'page-load') {
      this.pageLoadTransaction = transaction;
      // @ts-expect-error 2339  block is a private property of Transaction interface
      this.pageLoadTransaction.block(true);
      this.pageLoadTransaction.mark('apm-setup');
    }
  }

  /* Close and clear the page load transaction */
  private closePageLoadTransaction() {
    if (this.pageLoadTransaction) {
      const loadCounts = this.resourceObserver.getCounts();
      this.pageLoadTransaction.addLabels({
        'loaded-resources': loadCounts.networkOrDisk,
        'cached-resources': loadCounts.memory,
      });
      this.resourceObserver.destroy();
      this.pageLoadTransaction.end();
      this.pageLoadTransaction = undefined;
    }
  }

  private markPageLoadStart() {
    if (this.pageLoadTransaction) {
      this.pageLoadTransaction.mark('apm-start');
    }
  }

  /**
   * Adds an observer to the APM configuration for normalizing transactions of the 'http-request' type to remove the
   * hostname, protocol, port, and base path. Allows for coorelating data cross different deployments.
   */
  private addHttpRequestNormalization(apm: ApmBase) {
    apm.observe('transaction:end', (t) => {
      if (t.type !== 'http-request') {
        return;
      }

      /** Split URLs of the from "GET protocol://hostname:port/pathname" into method & hostname */
      const matches = t.name.match(HTTP_REQUEST_TRANSACTION_NAME_REGEX);
      if (!matches) {
        return;
      }

      const [, method, originalUrl] = matches;
      // Normalize the URL
      const normalizedUrl = modifyUrl(originalUrl, (parts) => {
        const isAbsolute = parts.hostname && parts.protocol && parts.port;
        // If the request was to a different host, port, or protocol then don't change anything
        if (
          isAbsolute &&
          (parts.hostname !== window.location.hostname ||
            parts.protocol !== window.location.protocol ||
            parts.port !== window.location.port)
        ) {
          return;
        }

        // Strip the protocol, hostnname, port, and protocol slashes to normalize
        parts.protocol = null;
        parts.hostname = null;
        parts.port = null;
        parts.slashes = false;

        // Replace the basePath if present in the pathname
        if (parts.pathname === this.basePath) {
          parts.pathname = '/';
        } else if (parts.pathname?.startsWith(`${this.basePath}/`)) {
          parts.pathname = parts.pathname?.slice(this.basePath.length);
        }
      });

      t.name = `${method} ${normalizedUrl}`;
    });
  }
}
