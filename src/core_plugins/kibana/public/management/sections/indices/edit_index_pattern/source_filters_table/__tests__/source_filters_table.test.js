import React from 'react';
import { shallow } from 'enzyme';

import { SourceFiltersTable } from '../source_filters_table';

jest.mock('@elastic/eui', () => ({
  EuiButton: 'eui-button',
  EuiTableOfRecords: 'eui-table-of-records',
  EuiTitle: 'eui-title',
  EuiText: 'eui-text',
  EuiButton: 'eui-button',
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
jest.mock('../components/header', () => ({ Header: 'header' }));
jest.mock('../components/table', () => ({
  // Note: this seems to fix React complaining about non lowercase attributes
  Table: () => {
    return 'table';
  }
}));

const indexPattern = {
  sourceFilters: [
    { value: 'time*' },
    { value: 'nam*' },
    { value: 'age*' },
  ],
};


describe('SourceFiltersTable', () => {
  it('should render normally', async () => {
    const component = shallow(
      <SourceFiltersTable
        indexPattern={indexPattern}
        fieldWildcardMatcher={() => {}}
      />
    );

    await component.update(); // Fire `componentWillMount()`

    expect(component).toMatchSnapshot();
  });

  it('should filter based on the query bar', async () => {
    const component = shallow(
      <SourceFiltersTable
        indexPattern={indexPattern}
        fieldWildcardMatcher={() => {}}
      />
    );

    await component.update(); // Fire `componentWillMount()`

    component.setProps({ filterFilter: 'ti' });
    await component.update();

    expect(component).toMatchSnapshot();
  });

  it('should hide the table if there are no scripted fields', async () => {
    const component = shallow(
      <SourceFiltersTable
        indexPattern={{
          sourceFilters: []
        }}
        fieldWildcardMatcher={() => {}}
      />
    );

    await component.update(); // Fire `componentWillMount()`

    expect(component).toMatchSnapshot();
  });

  it('should should a loading indicator when saving', async () => {
    const component = shallow(
      <SourceFiltersTable
        indexPattern={{
          sourceFilters: [{ value: 'tim*' }]
        }}
        fieldWildcardMatcher={() => {}}
      />
    );

    await component.update(); // Fire `componentWillMount()`
    component.setState({ isSaving: true });

    expect(component).toMatchSnapshot();
  });

  it('should show a delete modal', async () => {
    const component = shallow(
      <SourceFiltersTable
        indexPattern={{
          sourceFilters: [{ value: 'tim*' }]
        }}
        fieldWildcardMatcher={() => {}}
      />
    );

    await component.update(); // Fire `componentWillMount()`
    component.instance().startDeleteFilter({ value: 'tim*' });
    await component.update();

    expect(component).toMatchSnapshot();
  });

  it('should remove a filter', async () => {
    const save = jest.fn();
    const component = shallow(
      <SourceFiltersTable
        indexPattern={{
          save,
          sourceFilters: [{ value: 'tim*' }, { value: 'na*' }]
        }}
        fieldWildcardMatcher={() => {}}
      />
    );

    await component.update(); // Fire `componentWillMount()`
    component.instance().startDeleteFilter({ value: 'tim*' });
    await component.update();
    await component.instance().deleteFilter();
    await component.update();

    expect(save).toBeCalled();
    expect(component).toMatchSnapshot();
  });

  it('should add a filter', async () => {
    const save = jest.fn();
    const component = shallow(
      <SourceFiltersTable
        indexPattern={{
          save,
          sourceFilters: [{ value: 'tim*' }]
        }}
        fieldWildcardMatcher={() => {}}
      />
    );

    await component.update(); // Fire `componentWillMount()`
    await component.instance().addFilter('na*');
    await component.update();

    expect(save).toBeCalled();
    expect(component).toMatchSnapshot();
  });

  it('should update a filter', async () => {
    const save = jest.fn();
    const component = shallow(
      <SourceFiltersTable
        indexPattern={{
          save,
          sourceFilters: [{ value: 'tim*' }]
        }}
        fieldWildcardMatcher={() => {}}
      />
    );

    await component.update(); // Fire `componentWillMount()`
    await component.instance().saveFilter({ oldFilterValue: 'tim*', newFilterValue: 'ti*' });
    await component.update();

    expect(save).toBeCalled();
    expect(component).toMatchSnapshot();
  });
});
