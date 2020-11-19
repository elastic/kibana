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

import { Query } from '@elastic/eui';
import { parseQuery } from './parse_query';

describe('getQueryText', () => {
  it('parses the query text', () => {
    const query = Query.parse('some search');

    expect(parseQuery(query)).toEqual({
      queryText: 'some search',
    });
  });

  it('parses the types', () => {
    const query = Query.parse('type:(index-pattern or dashboard) kibana');

    expect(parseQuery(query)).toEqual({
      queryText: 'kibana',
      visibleTypes: ['index-pattern', 'dashboard'],
    });
  });

  it('parses the tags', () => {
    const query = Query.parse('tag:(tag-1 or tag-2) kibana');

    expect(parseQuery(query)).toEqual({
      queryText: 'kibana',
      selectedTags: ['tag-1', 'tag-2'],
    });
  });

  it('parses all the fields', () => {
    const query = Query.parse('tag:(tag-1 or tag-2) type:(index-pattern) kibana');

    expect(parseQuery(query)).toEqual({
      queryText: 'kibana',
      visibleTypes: ['index-pattern'],
      selectedTags: ['tag-1', 'tag-2'],
    });
  });

  it('does not fail on unknown fields', () => {
    const query = Query.parse('unknown:(hello or dolly) some search');

    expect(parseQuery(query)).toEqual({
      queryText: 'some search',
    });
  });
});
