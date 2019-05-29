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
import { AbstractSearchRequest } from './abstract_request';

import { MultiSearchRequest } from './multi_search_request';
import { SingleSearchRequest } from './single_search_request';

export class SearchRequest extends AbstractSearchRequest {
  getSearchRequestType(searches) {
    const isMultiSearch = Array.isArray(searches) && searches.length > 1;
    const SearchRequest = isMultiSearch ? MultiSearchRequest : SingleSearchRequest;

    return new SearchRequest(this.req, this.callWithRequest);
  }

  async search(options) {
    const concreteSearchRequest = this.getSearchRequestType(options);

    return concreteSearchRequest.search(options);
  }
}
