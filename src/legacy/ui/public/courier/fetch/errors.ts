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

import { SearchError } from '../../courier';
import { KbnError } from '../../../../../plugins/kibana_utils/public';
import { SearchResponse } from '../types';
/**
 * Request Failure - When an entire multi request fails
 * @param {Error} err - the Error that came back
 * @param {Object} resp - optional HTTP response
 */
export class RequestFailure extends KbnError {
  public resp: SearchResponse;
  constructor(err: SearchError | null = null, resp?: SearchResponse) {
    super(`Request to Elasticsearch failed: ${JSON.stringify(resp || err?.message)}`);

    this.resp = resp;
  }
}
