/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import { Observable } from 'rxjs';
import { CoreStart, KibanaRequest } from 'kibana/server';
import { ISearchStrategy } from '../types';
import { IKibanaSearchRequest, IKibanaSearchResponse } from '../../../common/search';

export interface IScopedSessionService {
  search: <Request extends IKibanaSearchRequest, Response extends IKibanaSearchResponse>(
    strategy: ISearchStrategy<Request, Response>,
    ...args: Parameters<ISearchStrategy<Request, Response>['search']>
  ) => Observable<Response>;
  [prop: string]: any;
}

export interface ISessionService {
  asScopedProvider: (core: CoreStart) => (request: KibanaRequest) => IScopedSessionService;
}
