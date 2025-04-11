/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { ScoutTestConfig } from '../../types';
import { ScoutLogger } from './logger';

export interface PathOptions {
  /**
   * Query string parameters
   */
  params?: Record<string, string>;
  /**
   * The hash value of the URL
   */
  hash?: string;
}

export class KibanaUrl {
  #baseUrl: URL;

  constructor(baseUrl: URL) {
    this.#baseUrl = baseUrl;
  }

  /**
   * Get an absolute URL based on Kibana's URL
   * @param rel relative url, resolved relative to Kibana's url
   * @param options optional modifications to apply to the URL
   */
  get(rel?: string, options?: PathOptions) {
    const url = new URL(rel ?? '/', this.#baseUrl);

    if (options?.params) {
      for (const [key, value] of Object.entries(options.params)) {
        url.searchParams.set(key, value);
      }
    }

    if (options?.hash !== undefined) {
      url.hash = options.hash;
    }

    return url.href;
  }

  domain() {
    return this.#baseUrl.hostname;
  }

  /**
   * Get the URL for an app
   * @param appName name of the app to get the URL for
   * @param options optional modifications to apply to the URL
   */
  app(appName: string, options?: { space?: string; pathOptions?: PathOptions }) {
    const relPath = options?.space ? `s/${options.space}/app/${appName}` : `/app/${appName}`;
    return this.get(relPath, options?.pathOptions);
  }

  toString() {
    return this.#baseUrl.href;
  }
}

export function createKbnUrl(scoutConfig: ScoutTestConfig, log: ScoutLogger) {
  const kbnUrl = new KibanaUrl(new URL(scoutConfig.hosts.kibana));

  log.serviceLoaded('kbnUrl');

  return kbnUrl;
}
