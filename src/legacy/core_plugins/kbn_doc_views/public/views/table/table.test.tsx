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
import React from 'react';
import { render } from 'enzyme';
import { IndexPattern } from 'ui/index_patterns';
// @ts-ignore
import { flattenHitWrapper } from '../../../../data/public/index_patterns/index_patterns/flatten_hit';
import { DocViewTable } from './table';

// @ts-ignore
const indexPattern = {
  fields: {
    byName: {
      message: {
        name: 'message',
        type: 'string',
        scripted: false,
        filterable: false,
      },
      extension: {
        name: 'extension',
        type: 'string',
        scripted: false,
        filterable: true,
      },
      bytes: {
        name: 'extension',
        type: 'number',
        scripted: false,
        filterable: true,
      },
      scripted: {
        name: 'extension',
        type: 'number',
        scripted: true,
        filterable: true,
      },
    },
  },
  metaFields: ['_index', '_score'],
  flattenHit: undefined,
  formatHit: jest.fn(hit => hit),
} as IndexPattern;

indexPattern.flattenHit = flattenHitWrapper(indexPattern, {});

const hit = {
  _index: 'logstash-2014.09.09',
  _score: 1,
  _source: {
    message:
      'Lorem ipsum dolor sit amet, consectetuer adipiscing elit. \
      Aenean commodo ligula eget dolor. Aenean massa. Cum sociis natoque penatibus \
      et magnis dis parturient montes, nascetur ridiculus mus. Donec quam felis, \
      ultricies nec, pellentesque eu, pretium quis, sem. Nulla consequat massa quis enim. \
      Donec pede justo, fringilla vel, aliquet nec, vulputate eget, arcu. In enim justo, \
      rhoncus ut, imperdiet a, venenatis vitae, justo. Nullam dictum felis eu pede mollis pretium. \
      Integer tincidunt. Cras dapibus. Vivamus elementum semper nisi. Aenean vulputate eleifend tellus. \
      Phasellus ullamcorper ipsum rutrum nunc. Nunc nonummy metus. Vestibulum volutpat pretium libero. Cras id dui. Aenean ut',
    extension: 'html',
    bytes: 100,
    objectArray: [{ foo: true }],
    relatedContent: {
      test: 1,
    },
    scripted: 123,
    _underscore: 123,
  },
};

it('renders the `DocViewTable` component', () => {
  const props = {
    hit,
    columns: ['extension'],
    indexPattern,
    filter: jest.fn(),
    onAddColumn: jest.fn(),
    onRemoveColumn: jest.fn(),
  };
  expect(render(<DocViewTable {...props} />)).toMatchSnapshot();
});
