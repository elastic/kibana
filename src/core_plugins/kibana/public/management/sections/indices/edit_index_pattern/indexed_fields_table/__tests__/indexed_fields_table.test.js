import React from 'react';
import { shallow } from 'enzyme';

import { IndexedFieldsTable } from '../indexed_fields_table';

jest.mock('@elastic/eui', () => ({
  EuiFlexGroup: 'eui-flex-group',
  EuiFlexItem: 'eui-flex-item',
  EuiIcon: 'eui-icon',
  EuiInMemoryTable: 'eui-in-memory-table',
  TooltipTrigger: 'tooltip-trigger'
}));

jest.mock('../components/table', () => ({
  // Note: this seems to fix React complaining about non lowercase attributes
  Table: () => {
    return 'table';
  }
}));

const helpers = {
  redirectToRoute: () => {},
};

const indexPattern = {
  getNonScriptedFields: () => ([
    { name: 'Elastic', displayName: 'Elastic', searchable: true },
    { name: 'timestamp', displayName: 'timestamp', type: 'date' },
    { name: 'conflictingField', displayName: 'conflictingField', type: 'conflict' },
  ])
};

describe('IndexedFieldsTable', () => {
  it('should render normally', async () => {
    const component = shallow(
      <IndexedFieldsTable
        indexPattern={indexPattern}
        helpers={helpers}
        fieldWildcardMatcher={() => {}}
      />
    );

    // Allow the componentWillMount code to execute
    // https://github.com/airbnb/enzyme/issues/450
    await component.update(); // Fire `componentWillMount()`
    await component.update(); // Fire `componentWillMount()`
    await component.update(); // Force update the component post async actions

    expect(component).toMatchSnapshot();
  });

  it('should filter based on the query bar', async () => {
    const component = shallow(
      <IndexedFieldsTable
        indexPattern={indexPattern}
        helpers={helpers}
        fieldWildcardMatcher={() => {}}
      />
    );

    // Allow the componentWillMount code to execute
    // https://github.com/airbnb/enzyme/issues/450
    await component.update(); // Fire `componentWillMount()`
    await component.update(); // Force update the component post async actions

    component.setProps({ fieldFilter: 'Elast' });
    component.update();

    expect(component).toMatchSnapshot();
  });

  it('should filter based on the type filter', async () => {
    const component = shallow(
      <IndexedFieldsTable
        indexPattern={indexPattern}
        helpers={helpers}
        fieldWildcardMatcher={() => {}}
      />
    );

    // Allow the componentWillMount code to execute
    // https://github.com/airbnb/enzyme/issues/450
    await component.update(); // Fire `componentWillMount()`
    await component.update(); // Force update the component post async actions

    component.setProps({ indexedFieldTypeFilter: 'date' });
    component.update();

    expect(component).toMatchSnapshot();
  });
});
