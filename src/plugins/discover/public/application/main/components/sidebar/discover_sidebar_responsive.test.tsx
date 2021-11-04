/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { each, cloneDeep } from 'lodash';
import { BehaviorSubject } from 'rxjs';
import { ReactWrapper } from 'enzyme';
import { findTestSubject } from '@elastic/eui/lib/test';
// @ts-expect-error
import realHits from '../../../../__fixtures__/real_hits.js';
import { act } from 'react-dom/test-utils';
import { mountWithIntl } from '@kbn/test/jest';
import React from 'react';
import { flattenHit, IndexPatternAttributes } from '../../../../../../data/common';
import { SavedObject } from '../../../../../../../core/types';
import {
  DiscoverSidebarResponsive,
  DiscoverSidebarResponsiveProps,
} from './discover_sidebar_responsive';
import { DiscoverServices } from '../../../../build_services';
import { ElasticSearchHit } from '../../../../services/doc_views/doc_views_types';
import { FetchStatus } from '../../../types';
import { DataDocuments$ } from '../../utils/use_saved_search';
import { stubLogstashIndexPattern } from '../../../../../../data/common/stubs';
import { VIEW_MODE } from '../../../../components/view_mode_toggle';

const mockServices = {
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
} as unknown as DiscoverServices;

const mockfieldCounts: Record<string, number> = {};
const mockCalcFieldCounts = jest.fn(() => {
  return mockfieldCounts;
});

jest.mock('../../../../kibana_services', () => ({
  getUiActions: jest.fn(() => {
    return {
      getTriggerCompatibleActions: jest.fn(() => []),
    };
  }),
  getServices: () => mockServices,
}));

jest.mock('../../utils/calc_field_counts', () => ({
  calcFieldCounts: () => mockCalcFieldCounts(),
}));

function getCompProps(): DiscoverSidebarResponsiveProps {
  const indexPattern = stubLogstashIndexPattern;

  // @ts-expect-error _.each() is passing additional args to flattenHit
  const hits = each(cloneDeep(realHits), (hit) => flattenHit(hit, indexPattern)) as Array<
    Record<string, unknown>
  > as ElasticSearchHit[];

  const indexPatternList = [
    { id: '0', attributes: { title: 'b' } } as SavedObject<IndexPatternAttributes>,
    { id: '1', attributes: { title: 'a' } } as SavedObject<IndexPatternAttributes>,
    { id: '2', attributes: { title: 'c' } } as SavedObject<IndexPatternAttributes>,
  ];

  for (const hit of hits) {
    for (const key of Object.keys(flattenHit(hit, indexPattern))) {
      mockfieldCounts[key] = (mockfieldCounts[key] || 0) + 1;
    }
  }
  return {
    columns: ['extension'],
    documents$: new BehaviorSubject({
      fetchStatus: FetchStatus.COMPLETE,
      result: hits as ElasticSearchHit[],
    }) as DataDocuments$,
    indexPatternList,
    onChangeIndexPattern: jest.fn(),
    onAddFilter: jest.fn(),
    onAddField: jest.fn(),
    onRemoveField: jest.fn(),
    selectedIndexPattern: indexPattern,
    services: mockServices,
    state: {},
    trackUiMetric: jest.fn(),
    onEditRuntimeField: jest.fn(),
    viewMode: VIEW_MODE.DOCUMENT_LEVEL,
  };
}

describe('discover responsive sidebar', function () {
  let props: DiscoverSidebarResponsiveProps;
  let comp: ReactWrapper<DiscoverSidebarResponsiveProps>;

  beforeAll(() => {
    props = getCompProps();
    comp = mountWithIntl(<DiscoverSidebarResponsive {...props} />);
  });

  it('should have Selected Fields and Available Fields with Popular Fields sections', function () {
    const popular = findTestSubject(comp, 'fieldList-popular');
    const selected = findTestSubject(comp, 'fieldList-selected');
    const unpopular = findTestSubject(comp, 'fieldList-unpopular');
    expect(popular.children().length).toBe(1);
    expect(unpopular.children().length).toBe(7);
    expect(selected.children().length).toBe(1);
    expect(mockCalcFieldCounts.mock.calls.length).toBe(1);
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
  it('should allow filtering by string, and calcFieldCount should just be executed once', function () {
    expect(findTestSubject(comp, 'fieldList-unpopular').children().length).toBe(7);
    act(() => {
      findTestSubject(comp, 'fieldFilterSearchInput').simulate('change', {
        target: { value: 'abc' },
      });
    });
    comp.update();
    expect(findTestSubject(comp, 'fieldList-unpopular').children().length).toBe(4);
    expect(mockCalcFieldCounts.mock.calls.length).toBe(1);
  });
});
