/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { BehaviorSubject } from 'rxjs';
import { ReactWrapper } from 'enzyme';
import { findTestSubject } from '@elastic/eui/lib/test';
import { getDataTableRecords } from '../../../../__fixtures__/real_hits';
import { act } from 'react-dom/test-utils';
import { mountWithIntl } from '@kbn/test-jest-helpers';
import React from 'react';
import { DataViewAttributes } from '@kbn/data-views-plugin/public';
import { SavedObject } from '@kbn/core/types';
import {
  DiscoverSidebarResponsive,
  DiscoverSidebarResponsiveProps,
} from './discover_sidebar_responsive';
import { DiscoverServices } from '../../../../build_services';
import { FetchStatus } from '../../../types';
import { AvailableFields$, DataDocuments$ } from '../../hooks/use_saved_search';
import { stubLogstashIndexPattern } from '@kbn/data-plugin/common/stubs';
import { VIEW_MODE } from '../../../../components/view_mode_toggle';
import { KibanaContextProvider } from '@kbn/kibana-react-plugin/public';

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
  docLinks: { links: { discover: { fieldTypeHelp: '' } } },
  dataViewEditor: {
    userPermissions: {
      editDataView: jest.fn(() => true),
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
}));

jest.mock('../../utils/calc_field_counts', () => ({
  calcFieldCounts: () => mockCalcFieldCounts(),
}));

function getCompProps(): DiscoverSidebarResponsiveProps {
  const indexPattern = stubLogstashIndexPattern;

  const hits = getDataTableRecords(indexPattern);

  const indexPatternList = [
    { id: '0', attributes: { title: 'b' } } as SavedObject<DataViewAttributes>,
    { id: '1', attributes: { title: 'a' } } as SavedObject<DataViewAttributes>,
    { id: '2', attributes: { title: 'c' } } as SavedObject<DataViewAttributes>,
  ];

  for (const hit of hits) {
    for (const key of Object.keys(hit.flattened)) {
      mockfieldCounts[key] = (mockfieldCounts[key] || 0) + 1;
    }
  }

  return {
    columns: ['extension'],
    documents$: new BehaviorSubject({
      fetchStatus: FetchStatus.COMPLETE,
      result: hits,
    }) as DataDocuments$,
    availableFields$: new BehaviorSubject({
      fetchStatus: FetchStatus.COMPLETE,
      fields: [] as string[],
    }) as AvailableFields$,
    indexPatternList,
    onChangeIndexPattern: jest.fn(),
    onAddFilter: jest.fn(),
    onAddField: jest.fn(),
    onRemoveField: jest.fn(),
    selectedIndexPattern: indexPattern,
    state: {},
    trackUiMetric: jest.fn(),
    onEditRuntimeField: jest.fn(),
    viewMode: VIEW_MODE.DOCUMENT_LEVEL,
    onDataViewCreated: jest.fn(),
    useNewFieldsApi: true,
  };
}

describe('discover responsive sidebar', function () {
  let props: DiscoverSidebarResponsiveProps;
  let comp: ReactWrapper<DiscoverSidebarResponsiveProps>;

  beforeAll(() => {
    props = getCompProps();
    comp = mountWithIntl(
      <KibanaContextProvider services={mockServices}>
        <DiscoverSidebarResponsive {...props} />
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
    expect(findTestSubject(comp, 'fieldList-unpopular').children().length).toBe(6);
    act(() => {
      findTestSubject(comp, 'fieldFilterSearchInput').simulate('change', {
        target: { value: 'abc' },
      });
    });
    comp.update();
    expect(findTestSubject(comp, 'fieldList-unpopular').children().length).toBe(4);
    expect(mockCalcFieldCounts.mock.calls.length).toBe(1);
  });

  it('should show "Add a field" button to create a runtime field', () => {
    expect(mockServices.dataViewEditor.userPermissions.editDataView).toHaveBeenCalled();
    expect(findTestSubject(comp, 'indexPattern-add-field_btn').length).toBe(1);
  });

  it('should not show "Add a field" button in viewer mode', () => {
    const mockedServicesInViewerMode = {
      ...mockServices,
      dataViewEditor: {
        ...mockServices.dataViewEditor,
        userPermissions: {
          ...mockServices.dataViewEditor.userPermissions,
          editDataView: jest.fn(() => false),
        },
      },
    };
    const compInViewerMode = mountWithIntl(
      <KibanaContextProvider services={mockedServicesInViewerMode}>
        <DiscoverSidebarResponsive {...props} />
      </KibanaContextProvider>
    );
    expect(
      mockedServicesInViewerMode.dataViewEditor.userPermissions.editDataView
    ).toHaveBeenCalled();
    expect(findTestSubject(compInViewerMode, 'indexPattern-add-field_btn').length).toBe(0);
  });
});
