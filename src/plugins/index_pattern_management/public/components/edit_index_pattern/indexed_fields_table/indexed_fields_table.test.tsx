/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import React from 'react';
import { shallow } from 'enzyme';
import { IndexPatternField, IndexPattern } from 'src/plugins/data/public';
import { IndexedFieldsTable } from './indexed_fields_table';

jest.mock('@elastic/eui', () => ({
  EuiFlexGroup: 'eui-flex-group',
  EuiFlexItem: 'eui-flex-item',
  EuiIcon: 'eui-icon',
  EuiInMemoryTable: 'eui-in-memory-table',
}));

jest.mock('./components/table', () => ({
  // Note: this seems to fix React complaining about non lowercase attributes
  Table: () => {
    return 'table';
  },
}));

const helpers = {
  redirectToRoute: (obj: any) => {},
  getFieldInfo: () => [],
};

const indexPattern = ({
  getNonScriptedFields: () => fields,
  getFormatterForFieldNoDefault: () => ({ params: () => ({}) }),
} as unknown) as IndexPattern;

const mockFieldToIndexPatternField = (spec: Record<string, string | boolean | undefined>) => {
  return new IndexPatternField((spec as unknown) as IndexPatternField['spec']);
};

const fields = [
  {
    name: 'Elastic',
    displayName: 'Elastic',
    searchable: true,
    type: 'string',
  },
  { name: 'timestamp', displayName: 'timestamp', type: 'date' },
  { name: 'conflictingField', displayName: 'conflictingField', type: 'conflict' },
].map(mockFieldToIndexPatternField);

describe('IndexedFieldsTable', () => {
  test('should render normally', async () => {
    const component = shallow(
      <IndexedFieldsTable
        fields={fields}
        indexPattern={indexPattern}
        helpers={helpers}
        fieldWildcardMatcher={() => {
          return () => false;
        }}
        indexedFieldTypeFilter=""
        fieldFilter=""
      />
    );

    await new Promise((resolve) => process.nextTick(resolve));
    component.update();

    expect(component).toMatchSnapshot();
  });

  test('should filter based on the query bar', async () => {
    const component = shallow(
      <IndexedFieldsTable
        fields={fields}
        indexPattern={indexPattern}
        helpers={helpers}
        fieldWildcardMatcher={() => {
          return () => false;
        }}
        indexedFieldTypeFilter=""
        fieldFilter=""
      />
    );

    await new Promise((resolve) => process.nextTick(resolve));
    component.setProps({ fieldFilter: 'Elast' });
    component.update();

    expect(component).toMatchSnapshot();
  });

  test('should filter based on the type filter', async () => {
    const component = shallow(
      <IndexedFieldsTable
        fields={fields}
        indexPattern={indexPattern}
        helpers={helpers}
        fieldWildcardMatcher={() => {
          return () => false;
        }}
        indexedFieldTypeFilter=""
        fieldFilter=""
      />
    );

    await new Promise((resolve) => process.nextTick(resolve));
    component.setProps({ indexedFieldTypeFilter: 'date' });
    component.update();

    expect(component).toMatchSnapshot();
  });
});
