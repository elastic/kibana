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

import { IndexPattern, indexPatterns } from '../kibana_services';
import { IIndexPatternFieldList } from '../../../data/common/index_patterns/fields';

const fields = [
  {
    name: '_index',
    type: 'string',
    scripted: false,
    filterable: true,
  },
  {
    name: 'message',
    type: 'string',
    scripted: false,
    filterable: false,
  },
  {
    name: 'extension',
    type: 'string',
    scripted: false,
    filterable: true,
  },
  {
    name: 'bytes',
    type: 'number',
    scripted: false,
    filterable: true,
  },
  {
    name: 'scripted',
    type: 'number',
    scripted: true,
    filterable: false,
  },
] as IIndexPatternFieldList;

fields.getByName = (name: string) => {
  return fields.find((field) => field.name === name);
};

const indexPattern = ({
  id: 'the-index-pattern-id',
  title: 'the-index-pattern-title',
  metaFields: ['_index', '_score'],
  flattenHit: undefined,
  formatHit: jest.fn((hit) => hit._source),
  fields,
  getComputedFields: () => ({}),
  getSourceFiltering: () => ({}),
  getFieldByName: () => ({}),
} as unknown) as IndexPattern;

indexPattern.flattenHit = indexPatterns.flattenHitWrapper(indexPattern, indexPattern.metaFields);

export const indexPatternMock = indexPattern;
