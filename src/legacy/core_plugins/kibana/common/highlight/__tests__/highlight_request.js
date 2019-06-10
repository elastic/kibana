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

import expect from '@kbn/expect';
import { getHighlightRequest } from '../highlight_request';

describe('getHighlightRequest', () => {
  let configMock;
  const getConfig = (key) => configMock[key];
  const queryStringQuery = { query_string: { query: 'foo' } };

  beforeEach(function () {
    configMock = {};
    configMock['doc_table:highlight'] = true;
  });

  it('should be a function', () => {
    expect(getHighlightRequest).to.be.a(Function);
  });

  it('should not modify the original query', () => {
    getHighlightRequest(queryStringQuery, getConfig);
    expect(queryStringQuery.query_string).to.not.have.property('highlight');
  });

  it('should return undefined if highlighting is turned off', () => {
    configMock['doc_table:highlight'] = false;
    const request = getHighlightRequest(queryStringQuery, getConfig);
    expect(request).to.be(undefined);
  });

  it('should enable/disable highlighting if config is changed', () => {
    let request = getHighlightRequest(queryStringQuery, getConfig);
    expect(request).to.not.be(undefined);

    configMock['doc_table:highlight'] = false;
    request = getHighlightRequest(queryStringQuery, getConfig);
    expect(request).to.be(undefined);
  });
});
