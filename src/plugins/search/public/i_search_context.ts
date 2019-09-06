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
import { Observable } from 'rxjs';
import { CoreSetup } from '../../../core/public';
import { IKibanaClientSearchRequest, IKibanaClientSearchResponse, ISearchOptions } from './types';
import { IClientSearchStrategy } from './i_setup_contract';

export interface ISearchContext {
  core: CoreSetup;
  search: {
    search: <
      TRequest extends IKibanaClientSearchRequest,
      TResponse extends IKibanaClientSearchResponse<any>
    >(
      request: TRequest,
      options: ISearchOptions,
      name: string
    ) => Observable<TResponse>;

    getClientSearchStrategy: <
      TRequest extends IKibanaClientSearchRequest,
      TResponse extends IKibanaClientSearchResponse<any>
    >(
      name: string
    ) => Promise<IClientSearchStrategy<TRequest, TResponse>>;
  };
}
