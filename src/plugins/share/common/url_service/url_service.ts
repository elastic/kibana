/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { LocatorClient, LocatorClientDependencies } from './locators';
import {
  IShortUrlClientFactoryProvider,
  IShortUrlClientFactory,
  IShortUrlClient,
} from './short_urls';

export interface UrlServiceDependencies<
  D = unknown,
  ShortUrlClient extends IShortUrlClient = IShortUrlClient
> extends LocatorClientDependencies {
  shortUrls: IShortUrlClientFactoryProvider<D, ShortUrlClient>;
}

/**
 * Common URL Service client interface for server-side and client-side.
 */
export class UrlService<D = unknown, ShortUrlClient extends IShortUrlClient = IShortUrlClient> {
  /**
   * Client to work with locators.
   */
  public readonly locators: LocatorClient;

  public readonly shortUrls: IShortUrlClientFactory<D, ShortUrlClient>;

  constructor(protected readonly deps: UrlServiceDependencies<D, ShortUrlClient>) {
    this.locators = new LocatorClient(deps);
    this.shortUrls = deps.shortUrls({
      locators: this.locators,
    });
  }
}
