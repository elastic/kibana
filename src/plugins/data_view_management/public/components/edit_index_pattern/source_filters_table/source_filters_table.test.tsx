/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';
import { shallow } from 'enzyme';

import { SourceFiltersTable } from './source_filters_table';
import { DataView } from 'src/plugins/data_views/public';

jest.mock('@elastic/eui', () => ({
  EuiButton: 'eui-button',
  EuiTitle: 'eui-title',
  EuiText: 'eui-text',
  EuiHorizontalRule: 'eui-horizontal-rule',
  EuiSpacer: 'eui-spacer',
  EuiCallOut: 'eui-call-out',
  EuiLink: 'eui-link',
  EuiOverlayMask: 'eui-overlay-mask',
  EuiConfirmModal: 'eui-confirm-modal',
  EuiLoadingSpinner: 'eui-loading-spinner',
  Comparators: {
    property: () => {},
    default: () => {},
  },
}));

jest.mock('./components/header', () => ({ Header: 'header' }));
jest.mock('./components/table', () => ({
  // Note: this seems to fix React complaining about non lowercase attributes
  Table: () => {
    return 'table';
  },
}));

const getIndexPatternMock = (mockedFields: any = {}) =>
  ({
    sourceFilters: [{ value: 'time*' }, { value: 'nam*' }, { value: 'age*' }],
    ...mockedFields,
  } as DataView);

describe('SourceFiltersTable', () => {
  test('should render normally', () => {
    const component = shallow(
      <SourceFiltersTable
        indexPattern={getIndexPatternMock()}
        fieldWildcardMatcher={() => {}}
        filterFilter={''}
        saveIndexPattern={async () => {}}
      />
    );

    expect(component).toMatchSnapshot();
  });

  test('should filter based on the query bar', () => {
    const component = shallow(
      <SourceFiltersTable
        indexPattern={getIndexPatternMock()}
        fieldWildcardMatcher={() => {}}
        filterFilter={''}
        saveIndexPattern={async () => {}}
      />
    );

    component.setProps({ filterFilter: 'ti' });
    expect(component).toMatchSnapshot();
  });

  test('should should a loading indicator when saving', () => {
    const component = shallow(
      <SourceFiltersTable
        indexPattern={getIndexPatternMock({
          sourceFilters: [{ value: 'tim*' }],
        })}
        filterFilter={''}
        fieldWildcardMatcher={() => {}}
        saveIndexPattern={async () => {}}
      />
    );

    component.setState({ isSaving: true });
    expect(component).toMatchSnapshot();
  });

  test('should show a delete modal', () => {
    const component = shallow<SourceFiltersTable>(
      <SourceFiltersTable
        indexPattern={
          getIndexPatternMock({
            sourceFilters: [{ value: 'tim*' }],
          }) as DataView
        }
        filterFilter={''}
        fieldWildcardMatcher={() => {}}
        saveIndexPattern={async () => {}}
      />
    );

    component.instance().startDeleteFilter({ value: 'tim*', clientId: 1 });
    component.update(); // We are not calling `.setState` directly so we need to re-render
    expect(component).toMatchSnapshot();
  });

  test('should remove a filter', async () => {
    const saveIndexPattern = jest.fn(async () => {});
    const component = shallow<SourceFiltersTable>(
      <SourceFiltersTable
        indexPattern={
          getIndexPatternMock({
            sourceFilters: [{ value: 'tim*' }, { value: 'na*' }],
          }) as DataView
        }
        filterFilter={''}
        fieldWildcardMatcher={() => {}}
        saveIndexPattern={saveIndexPattern}
      />
    );

    component.instance().startDeleteFilter({ value: 'tim*', clientId: 1 });
    component.update(); // We are not calling `.setState` directly so we need to re-render
    await component.instance().deleteFilter();
    component.update(); // We are not calling `.setState` directly so we need to re-render

    expect(saveIndexPattern).toBeCalled();
    expect(component).toMatchSnapshot();
  });

  test('should add a filter', async () => {
    const saveIndexPattern = jest.fn(async () => {});
    const component = shallow<SourceFiltersTable>(
      <SourceFiltersTable
        indexPattern={getIndexPatternMock({
          sourceFilters: [{ value: 'tim*' }],
        })}
        filterFilter={''}
        fieldWildcardMatcher={() => {}}
        saveIndexPattern={saveIndexPattern}
      />
    );

    await component.instance().onAddFilter('na*');
    component.update(); // We are not calling `.setState` directly so we need to re-render

    expect(saveIndexPattern).toBeCalled();
    expect(component).toMatchSnapshot();
  });

  test('should update a filter', async () => {
    const saveIndexPattern = jest.fn(async () => {});
    const component = shallow<SourceFiltersTable>(
      <SourceFiltersTable
        indexPattern={
          getIndexPatternMock({
            sourceFilters: [{ value: 'tim*' }],
          }) as DataView
        }
        filterFilter={''}
        fieldWildcardMatcher={() => {}}
        saveIndexPattern={saveIndexPattern}
      />
    );

    await component.instance().saveFilter({ clientId: 'tim*', value: 'ti*' });
    component.update(); // We are not calling `.setState` directly so we need to re-render

    expect(saveIndexPattern).toBeCalled();
    expect(component).toMatchSnapshot();
  });
});
