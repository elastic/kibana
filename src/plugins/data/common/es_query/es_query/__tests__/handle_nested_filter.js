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


import { handleNestedFilter } from '../handle_nested_filter';
import {  indexPatternResponse as indexPattern  } from '../../__fixtures__/index_pattern_response';
import { buildPhraseFilter, buildQueryFilter } from '../../filters';
import expect from '@kbn/expect';

describe('handleNestedFilter', function () {

  it('should return the filter\'s query wrapped in nested query if the target field is nested', () => {
    const field = getField('nestedField.child');
    const filter = buildPhraseFilter(field, 'foo', indexPattern);
    const result = handleNestedFilter(filter, indexPattern);
    expect(result).to.eql({
      nested: {
        path: 'nestedField',
        query: {
          match_phrase: {
            'nestedField.child': 'foo'
          }
        }
      }
    }
    );
  });

  it('should return filter untouched if it does not target a nested field', () => {
    const field = getField('extension');
    const filter = buildPhraseFilter(field, 'jpg', indexPattern);
    const result = handleNestedFilter(filter, indexPattern);
    expect(result).to.be(filter);
  });

  it('should return filter untouched if it does not target a field from the given index pattern', () => {
    const field = { ...getField('extension'), name: 'notarealfield' };
    const filter = buildPhraseFilter(field, 'jpg', indexPattern);
    const result = handleNestedFilter(filter, indexPattern);
    expect(result).to.be(filter);
  });

  it('should return filter untouched if no index pattern is provided', () => {
    const field = getField('extension');
    const filter = buildPhraseFilter(field, 'jpg', indexPattern);
    const result = handleNestedFilter(filter);
    expect(result).to.be(filter);
  });

  it('should return the filter untouched if a target field cannot be determined', () => {
    // for example, we don't support query_string queries
    const filter = buildQueryFilter({
      query: {
        query_string: {
          query: 'response:200'
        }
      }
    }, indexPattern.id);
    const result = handleNestedFilter(filter);
    expect(result).to.be(filter);
  });
});


function getField(name) {
  return indexPattern.fields.find(field => field.name === name);
}
