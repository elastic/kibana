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

import MockLogstashFieldsProvider from 'fixtures/logstash_fields';
import sinon from 'sinon';

import { IndexPatternsApiClientProvider } from '../index_patterns_api_client_provider';

// place in a ngMock.module() call to swap out the IndexPatternsApiClient
export function StubIndexPatternsApiClientModule(PrivateProvider) {
  PrivateProvider.swap(
    IndexPatternsApiClientProvider,
    (Private, Promise) => {
      let nonScriptedFields = Private(MockLogstashFieldsProvider).filter(field => (
        field.scripted !== true
      ));

      class StubIndexPatternsApiClient {
        getFieldsForTimePattern = sinon.spy(() => Promise.resolve(nonScriptedFields));
        getFieldsForWildcard = sinon.spy(() => Promise.resolve(nonScriptedFields));

        swapStubNonScriptedFields = (newNonScriptedFields) => {
          nonScriptedFields = newNonScriptedFields;
        }
      }

      return new StubIndexPatternsApiClient();
    }
  );
}
