/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { LocatorClientDependencies } from './locators';
import type { LocatorClient } from './locators';
import type {
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
export declare class UrlService<
  D = unknown,
  ShortUrlClient extends IShortUrlClient = IShortUrlClient
> {
  protected readonly deps: UrlServiceDependencies<D, ShortUrlClient>;
  /**
   * Client to work with locators.
   */
  readonly locators: LocatorClient;
  readonly shortUrls: IShortUrlClientFactory<D, ShortUrlClient>;
  constructor(deps: UrlServiceDependencies<D, ShortUrlClient>);
}
