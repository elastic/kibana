/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { cloneDeep, each } from 'lodash';
import { ReactWrapper } from 'enzyme';
import { findTestSubject } from '@elastic/eui/lib/test';
// @ts-expect-error
import realHits from '../../../../__fixtures__/real_hits.js';

import { mountWithIntl } from '@kbn/test-jest-helpers';
import React from 'react';
import { DiscoverSidebarProps } from './discover_sidebar';
import { flattenHit } from '../../../../../../data/public';
import { DataViewAttributes } from '../../../../../../data_views/public';
import { SavedObject } from '../../../../../../../core/types';
import { getDefaultFieldFilter } from './lib/field_filter';
import { DiscoverSidebarComponent as DiscoverSidebar } from './discover_sidebar';
import { discoverServiceMock as mockDiscoverServices } from '../../../../__mocks__/services';
import { stubLogstashIndexPattern } from '../../../../../../data/common/stubs';
import { VIEW_MODE } from '../../../../components/view_mode_toggle';
import { ElasticSearchHit } from '../../../../types';
import { KibanaContextProvider } from '../../../../../../kibana_react/public';
import { BehaviorSubject } from 'rxjs';
import { FetchStatus } from '../../../types';
import { AvailableFields$ } from '../../utils/use_saved_search';

function getCompProps(): DiscoverSidebarProps {
  const indexPattern = stubLogstashIndexPattern;
  const hits = each(cloneDeep(realHits), (hit) =>
    flattenHit(hit, indexPattern)
  ) as unknown as ElasticSearchHit[];

  const indexPatternList = [
    { id: '0', attributes: { title: 'b' } } as SavedObject<DataViewAttributes>,
    { id: '1', attributes: { title: 'a' } } as SavedObject<DataViewAttributes>,
    { id: '2', attributes: { title: 'c' } } as SavedObject<DataViewAttributes>,
  ];

  const fieldCounts: Record<string, number> = {};

  for (const hit of hits) {
    for (const key of Object.keys(flattenHit(hit, indexPattern))) {
      fieldCounts[key] = (fieldCounts[key] || 0) + 1;
    }
  }
  const availableFields$ = new BehaviorSubject({
    fetchStatus: FetchStatus.COMPLETE,
    fields: [] as string[],
  }) as AvailableFields$;

  return {
    columns: ['extension'],
    fieldCounts,
    documents: hits,
    indexPatternList,
    onChangeIndexPattern: jest.fn(),
    onAddFilter: jest.fn(),
    onAddField: jest.fn(),
    onRemoveField: jest.fn(),
    selectedIndexPattern: indexPattern,
    state: {},
    trackUiMetric: jest.fn(),
    fieldFilter: getDefaultFieldFilter(),
    setFieldFilter: jest.fn(),
    onEditRuntimeField: jest.fn(),
    editField: jest.fn(),
    viewMode: VIEW_MODE.DOCUMENT_LEVEL,
    createNewDataView: jest.fn(),
    onDataViewCreated: jest.fn(),
    availableFields$,
  };
}

describe('discover sidebar', function () {
  let props: DiscoverSidebarProps;
  let comp: ReactWrapper<DiscoverSidebarProps>;

  beforeAll(() => {
    props = getCompProps();
    comp = mountWithIntl(
      <KibanaContextProvider services={mockDiscoverServices}>
        <DiscoverSidebar {...props} />
      </KibanaContextProvider>
    );
  });

  it('should have Selected Fields and Available Fields with Popular Fields sections', function () {
    const popular = findTestSubject(comp, 'fieldList-popular');
    const selected = findTestSubject(comp, 'fieldList-selected');
    const unpopular = findTestSubject(comp, 'fieldList-unpopular');
    expect(popular.children().length).toBe(1);
    expect(unpopular.children().length).toBe(6);
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
