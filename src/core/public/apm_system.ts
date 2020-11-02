/*
 * Licensed to Elasticsearch B.V. under one or more contributor
 * license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright
 * ownership. Elasticsearch B.V. licenses this file to you under
 * the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

import type { ApmBase } from '@elastic/apm-rum';
import { modifyUrl } from '@kbn/std';
import type { InternalApplicationStart } from './application';

/** "GET protocol://hostname:port/pathname" */
const HTTP_REQUEST_TRANSACTION_NAME_REGEX = /^(GET|POST|PUT|HEAD|PATCH|DELETE|OPTIONS|CONNECT|TRACE)\s(.*)$/;

/**
 * This is the entry point used to boot the frontend when serving a application
 * that lives in the Kibana Platform.
 */

interface ApmConfig {
  // AgentConfigOptions is not exported from @elastic/apm-rum
  active?: boolean;
  globalLabels?: Record<string, string>;
}

interface StartDeps {
  application: InternalApplicationStart;
}

export class ApmSystem {
  private readonly enabled: boolean;
  /**
   * `apmConfig` would be populated with relevant APM RUM agent
   * configuration if server is started with elastic.apm.* config.
   */
  constructor(private readonly apmConfig?: ApmConfig, private readonly basePath = '') {
    this.enabled = apmConfig != null && !!apmConfig.active;
  }

  async setup() {
    if (!this.enabled) return;
    const { init, apm } = await import('@elastic/apm-rum');
    const { globalLabels, ...apmConfig } = this.apmConfig!;
    if (globalLabels) {
      apm.addLabels(globalLabels);
    }

    this.addHttpRequestNormalization(apm);

    init(apmConfig);
  }

  async start(start?: StartDeps) {
    if (!this.enabled || !start) return;
    /**
     * Register listeners for navigation changes and capture them as
     * route-change transactions after Kibana app is bootstrapped
     */
    start.application.currentAppId$.subscribe((appId) => {
      const apmInstance = (window as any).elasticApm;
      if (appId && apmInstance && typeof apmInstance.startTransaction === 'function') {
        apmInstance.startTransaction(`/app/${appId}`, 'route-change', {
          managed: true,
          canReuse: true,
        });
      }
    });
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
