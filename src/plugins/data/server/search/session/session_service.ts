/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import { CoreStart, KibanaRequest } from 'kibana/server';
import { IKibanaSearchRequest, IKibanaSearchResponse } from '../../../common';
import { ISearchStrategy } from '../types';
import { ISessionService } from './types';

/**
 * The OSS session service. See data_enhanced in X-Pack for the search session service.
 */
export class SessionService implements ISessionService {
  constructor() {}

  public search<Request extends IKibanaSearchRequest, Response extends IKibanaSearchResponse>(
    strategy: ISearchStrategy<Request, Response>,
    ...args: Parameters<ISearchStrategy<Request, Response>['search']>
  ) {
    return strategy.search(...args);
  }

  public asScopedProvider(core: CoreStart) {
    return (request: KibanaRequest) => ({
      search: this.search,
    });
  }
}
