/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { each, cloneDeep } from 'lodash';
import { ReactWrapper } from 'enzyme';
import { findTestSubject } from '@elastic/eui/lib/test';
// @ts-ignore
import realHits from '../../../__fixtures__/real_hits.js';
// @ts-ignore
import stubbedLogstashFields from '../../../__fixtures__/logstash_fields';
import { mountWithIntl } from '@kbn/test/jest';
import React from 'react';
import { DiscoverSidebarProps } from './discover_sidebar';
import { coreMock } from '../../../../../../core/public/mocks';
import { IndexPatternAttributes } from '../../../../../data/common';
import { getStubIndexPattern } from '../../../../../data/public/test_utils';
import { SavedObject } from '../../../../../../core/types';
import { getDefaultFieldFilter } from './lib/field_filter';
import { DiscoverSidebar } from './discover_sidebar';
import { DiscoverServices } from '../../../build_services';
import { ElasticSearchHit } from '../../doc_views/doc_views_types';
import { configMock } from '../../../__mocks__/config';
import { indexPatternsMock } from '../../../__mocks__/index_patterns';

const mockServices = ({
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
      }
    },
  },
} as unknown) as DiscoverServices;

jest.mock('../../../kibana_services', () => ({
  getServices: () => mockServices,
}));

jest.mock('./lib/get_index_pattern_field_list', () => ({
  getIndexPatternFieldList: jest.fn((indexPattern) => indexPattern.fields),
}));

function getCompProps(): DiscoverSidebarProps {
  const indexPattern = getStubIndexPattern(
    'logstash-*',
    (cfg: any) => cfg,
    'time',
    stubbedLogstashFields(),
    coreMock.createSetup()
  );

  // @ts-expect-error _.each() is passing additional args to flattenHit
  const hits = (each(cloneDeep(realHits), indexPattern.flattenHit) as Array<
    Record<string, unknown>
  >) as ElasticSearchHit[];

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
    config: configMock,
    columns: ['extension'],
    fieldCounts,
    hits,
    indexPatternList,
    indexPatterns: indexPatternsMock,
    onAddFilter: jest.fn(),
    onAddField: jest.fn(),
    onRemoveField: jest.fn(),
    selectedIndexPattern: indexPattern,
    services: mockServices,
    state: {},
    trackUiMetric: jest.fn(),
    fieldFilter: getDefaultFieldFilter(),
    setFieldFilter: jest.fn(),
    setAppState: jest.fn(),
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
});
