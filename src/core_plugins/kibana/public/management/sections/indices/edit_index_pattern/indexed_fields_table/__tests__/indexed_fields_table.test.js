import React from 'react';
import { shallow } from 'enzyme';

import { IndexedFieldsTable } from '../indexed_fields_table';

jest.mock('@elastic/eui', () => ({
  EuiFlexGroup: 'eui-flex-group',
  EuiFlexItem: 'eui-flex-item',
  EuiIcon: 'eui-icon',
  EuiInMemoryTable: 'eui-in-memory-table',
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

const fields = [
  { name: 'Elastic', displayName: 'Elastic', searchable: true },
  { name: 'timestamp', displayName: 'timestamp', type: 'date' },
  { name: 'conflictingField', displayName: 'conflictingField', type: 'conflict' },
];

const indexPattern = {
  getNonScriptedFields: () => fields,
};

describe('IndexedFieldsTable', () => {
  it('should render normally', async () => {
    const component = shallow(
      <IndexedFieldsTable
        fields={fields}
        indexPattern={indexPattern}
        helpers={helpers}
        fieldWildcardMatcher={() => {}}
      />
    );

    await new Promise(resolve => process.nextTick(resolve));
    component.update();

    expect(component).toMatchSnapshot();
  });

  it('should filter based on the query bar', async () => {
    const component = shallow(
      <IndexedFieldsTable
        fields={fields}
        indexPattern={indexPattern}
        helpers={helpers}
        fieldWildcardMatcher={() => {}}
      />
    );

    await new Promise(resolve => process.nextTick(resolve));
    component.setProps({ fieldFilter: 'Elast' });
    component.update();

    expect(component).toMatchSnapshot();
  });

  it('should filter based on the type filter', async () => {
    const component = shallow(
      <IndexedFieldsTable
        fields={fields}
        indexPattern={indexPattern}
        helpers={helpers}
        fieldWildcardMatcher={() => {}}
      />
    );

    await new Promise(resolve => process.nextTick(resolve));
    component.setProps({ indexedFieldTypeFilter: 'date' });
    component.update();

    expect(component).toMatchSnapshot();
  });
});
