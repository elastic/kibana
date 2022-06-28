/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { IShortUrlClientFactory } from '../../../common/url_service';
import { BrowserShortUrlClient, BrowserShortUrlClientDependencies } from './short_url_client';

export type BrowserShortUrlClientFactoryDependencies = BrowserShortUrlClientDependencies;

export type BrowserShortUrlClientFactoryCreateParams = null;

export class BrowserShortUrlClientFactory
  implements IShortUrlClientFactory<BrowserShortUrlClientFactoryCreateParams>
{
  constructor(private readonly dependencies: BrowserShortUrlClientFactoryDependencies) {}

  public get(params: BrowserShortUrlClientFactoryCreateParams): BrowserShortUrlClient {
    const client = new BrowserShortUrlClient(this.dependencies);

    return client;
  }
}
