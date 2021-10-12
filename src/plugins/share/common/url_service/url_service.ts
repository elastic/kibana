/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { LocatorClient, LocatorClientDependencies } from './locators';
import { IShortUrlClientFactoryProvider, IShortUrlClientFactory } from './short_urls';

export interface UrlServiceDependencies<D = unknown> extends LocatorClientDependencies {
  shortUrls: IShortUrlClientFactoryProvider<D>;
}

/**
 * Common URL Service client interface for server-side and client-side.
 */
export class UrlService<D = unknown> {
  /**
   * Client to work with locators.
   */
  public readonly locators: LocatorClient;

  public readonly shortUrls: IShortUrlClientFactory<D>;

  constructor(protected readonly deps: UrlServiceDependencies<D>) {
    this.locators = new LocatorClient(deps);
    this.shortUrls = deps.shortUrls({
      locators: this.locators,
    });
  }
}
