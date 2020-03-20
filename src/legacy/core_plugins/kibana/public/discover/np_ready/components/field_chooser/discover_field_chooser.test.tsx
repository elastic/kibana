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

import _ from 'lodash';
// @ts-ignore
import StubIndexPattern from 'test_utils/stub_index_pattern';
// @ts-ignore
import realHits from 'fixtures/real_hits.js';
// @ts-ignore
import stubbedLogstashFields from 'fixtures/logstash_fields';
import { mountWithIntl } from 'test_utils/enzyme_helpers';
import React from 'react';
import { DiscoverFieldChooser } from './discover_field_chooser';
import { coreMock } from '../../../../../../../../core/public/mocks';

function getCompProps() {
  const indexPattern = new StubIndexPattern(
    'logstash-*',
    (cfg: any) => cfg,
    'time',
    stubbedLogstashFields(),
    coreMock.createStart()
  );

  const hits = _.each(_.cloneDeep(realHits), indexPattern.flattenHit);

  const indexPatternList = [
    { id: '0', attributes: { title: 'b' } },
    { id: '1', attributes: { title: 'a' } },
    { id: '2', attributes: { title: 'c' } },
  ];

  const fieldCounts = {};

  for (const hit of hits) {
    for (const key of Object.keys(indexPattern.flattenHit(hit))) {
      fieldCounts[key] = (fieldCounts[key] || 0) + 1;
    }
  }

  return {
    addField: jest.fn(),
    addFilter: jest.fn(),
    fieldCounts,
    fields: [],
    fieldTypes: [],
    filter: {
      vals: {
        name: '',
      },
    } as FieldFilter,
    groupedFields: { selected: [], popular: [], unpopular: [] },
    hits,
    indexPatternList,
    onAddFilter: jest.fn(),
    onAddField: jest.fn(),
    onRemoveField: jest.fn(),
    removeField: jest.fn(),
    selectedIndexPattern: indexPattern,
    setFilterValue: jest.fn(),
    setIndexPattern: jest.fn(),
    toggle: jest.fn(),
    getDetails: jest.fn(),
  };
}

describe('discover field chooser', function() {
  describe('Field listing', function() {
    it('should have Selected Fields, Fields and Popular Fields sections', function() {
      const comp = mountWithIntl(<DiscoverFieldChooser {...getCompProps()} />);

      // const headers = comp.find('.sidebar-list-header');
      // expect(headers.length).toBe(3);
      expect(comp.html()).toMatchSnapshot();
    });
  });
});
