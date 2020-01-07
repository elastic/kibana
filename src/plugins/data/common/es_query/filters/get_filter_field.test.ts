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

import { buildPhraseFilter } from './phrase_filter';
import { buildQueryFilter } from './query_string_filter';
import { getFilterField } from './get_filter_field';
import { IIndexPattern } from '../../index_patterns';
import { fields } from '../../index_patterns/fields/fields.mocks.ts';

describe('getFilterField', function() {
  const indexPattern: IIndexPattern = ({
    id: 'logstash-*',
    fields,
  } as unknown) as IIndexPattern;

  it('should return the field name from known filter types that target a specific field', () => {
    const field = indexPattern.fields.find(patternField => patternField.name === 'extension');
    const filter = buildPhraseFilter(field!, 'jpg', indexPattern);
    const result = getFilterField(filter);
    expect(result).toBe('extension');
  });

  it('should return undefined for filters that do not target a specific field', () => {
    const filter = buildQueryFilter(
      {
        query: {
          query_string: {
            query: 'response:200 and extension:jpg',
          },
        },
      },
      indexPattern.id!,
      ''
    );
    const result = getFilterField(filter);
    expect(result).toBe(undefined);
  });
});
