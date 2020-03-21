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
import { findTestSubject } from '@elastic/eui/lib/test';
// @ts-ignore
import StubIndexPattern from 'test_utils/stub_index_pattern';
// @ts-ignore
import realHits from 'fixtures/real_hits.js';
// @ts-ignore
import stubbedLogstashFields from 'fixtures/logstash_fields';
import { mountWithIntl } from 'test_utils/enzyme_helpers';
import React from 'react';
import { DiscoverSidebar } from './discover_sidebar';
import { coreMock } from '../../../../../../../../core/public/mocks';
import { IndexPatternAttributes } from '../../../../../../../../plugins/data/common';
import { SavedObject } from '../../../../../../../../core/types';

jest.mock('../../../kibana_services', () => ({
  getServices: () => ({
    uiSettings: {
      get: (key: string) => {
        if (key === 'fields:popularLimit') {
          return 5;
        }
      },
    },
  }),
}));

function getCompProps() {
  const indexPattern = new StubIndexPattern(
    'logstash-*',
    (cfg: any) => cfg,
    'time',
    stubbedLogstashFields(),
    coreMock.createStart()
  );

  const hits = _.each(_.cloneDeep(realHits), indexPattern.flattenHit) as Array<
    Record<string, unknown>
  >;

  const indexPatternList = [
    { id: '0', attributes: { title: 'b' } } as SavedObject<IndexPatternAttributes>,
    { id: '1', attributes: { title: 'a' } } as SavedObject<IndexPatternAttributes>,
    { id: '2', attributes: { title: 'c' } } as SavedObject<IndexPatternAttributes>,
  ];

  const fieldCounts: Record<string, number> = {};

  for (const hit of hits) {
    for (const key of Object.keys(indexPattern.flattenHit(hit))) {
      fieldCounts[key] = (fieldCounts[key] || 0) + 1;
    }
  }
  return {
    columns: ['extension'],
    fieldCounts,
    hits,
    indexPatternList,
    onAddFilter: jest.fn(),
    onAddField: jest.fn(),
    onRemoveField: jest.fn(),
    selectedIndexPattern: indexPattern,
    setIndexPattern: jest.fn(),
    state: {},
  };
}

describe('discover field chooser', function() {
  describe('Field listing', function() {
    it('should have Selected Fields, Fields and Popular Fields sections', function() {
      const comp = mountWithIntl(<DiscoverSidebar {...getCompProps()} />);
      const popular = findTestSubject(comp, 'fieldList-popular');
      const selected = findTestSubject(comp, 'fieldList-selected');
      const unpopular = findTestSubject(comp, 'fieldList-unpopular');
      expect(popular.children().length).toBe(2);
      expect(unpopular.children().length).toBe(7);
      expect(selected.children().length).toBe(1);
      expect(comp.html()).toMatchSnapshot();
    });
  });
});
