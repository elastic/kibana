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
import { ReactWrapper } from 'enzyme';
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
import { DiscoverSidebar, DiscoverSidebarProps } from './discover_sidebar';
import { coreMock } from '../../../../../../core/public/mocks';
import { IndexPatternAttributes } from '../../../../../data/common';
import { SavedObject } from '../../../../../../core/types';

jest.mock('../../../kibana_services', () => ({
  getServices: () => ({
    history: () => ({
      location: {
        search: '',
      },
    }),
    capabilities: {
      visualize: {
        show: true,
      },
      discover: {
        save: false,
      },
    },
    uiSettings: {
      get: (key: string) => {
        if (key === 'fields:popularLimit') {
          return 5;
        } else if (key === 'shortDots:enable') {
          return false;
        }
      },
    },
  }),
}));

jest.mock('./lib/get_index_pattern_field_list', () => ({
  getIndexPatternFieldList: jest.fn((indexPattern) => indexPattern.fields),
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

describe('discover sidebar', function () {
  let props: DiscoverSidebarProps;
  let comp: ReactWrapper<DiscoverSidebarProps>;

  beforeAll(() => {
    props = getCompProps();
    comp = mountWithIntl(<DiscoverSidebar {...props} />);
  });

  it('should have Selected Fields and Available Fields with Popular Fields sections', function () {
    const popular = findTestSubject(comp, 'fieldList-popular');
    const selected = findTestSubject(comp, 'fieldList-selected');
    const unpopular = findTestSubject(comp, 'fieldList-unpopular');
    expect(popular.children().length).toBe(1);
    expect(unpopular.children().length).toBe(7);
    expect(selected.children().length).toBe(1);
  });
  it('should allow selecting fields', function () {
    findTestSubject(comp, 'fieldToggle-bytes').simulate('click');
    expect(props.onAddField).toHaveBeenCalledWith('bytes');
  });
  it('should allow deselecting fields', function () {
    findTestSubject(comp, 'fieldToggle-extension').simulate('click');
    expect(props.onRemoveField).toHaveBeenCalledWith('extension');
  });
  it('should allow adding filters', function () {
    findTestSubject(comp, 'field-extension-showDetails').simulate('click');
    findTestSubject(comp, 'plus-extension-gif').simulate('click');
    expect(props.onAddFilter).toHaveBeenCalled();
  });
});
