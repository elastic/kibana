/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

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

  /**
   * Get the URL for an app
   * @param appName name of the app to get the URL for
   * @param options optional modifications to apply to the URL
   */
  app(appName: string, options?: PathOptions) {
    return this.get(`/app/${appName}`, options);
  }

  toString() {
    return this.#baseUrl.href;
  }
}
