/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';
import { shallow, ShallowWrapper } from 'enzyme';
import { DataViewField, DataView, DataViewType } from 'src/plugins/data_views/public';
import { IndexedFieldsTable } from './indexed_fields_table';
import { getFieldInfo } from '../../utils';
import { RuntimeField } from 'src/plugins/data_views/common';

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
  editField: (fieldName: string) => {},
  deleteField: (fieldName: string) => {},
  // getFieldInfo handles non rollups as well
  getFieldInfo,
};

const indexPattern = {
  getNonScriptedFields: () => fields,
  getFormatterForFieldNoDefault: () => ({ params: () => ({}) }),
} as unknown as DataView;

const rollupIndexPattern = {
  type: DataViewType.ROLLUP,
  typeMeta: {
    params: {
      'rollup-index': 'rollup',
    },
    aggs: {
      date_histogram: {
        timestamp: {
          agg: 'date_histogram',
          fixed_interval: '30s',
          delay: '30s',
          time_zone: 'UTC',
        },
      },
      terms: { Elastic: { agg: 'terms' } },
      histogram: { amount: { agg: 'histogram', interval: 5 } },
      avg: { amount: { agg: 'avg' } },
      max: { amount: { agg: 'max' } },
      min: { amount: { agg: 'min' } },
      sum: { amount: { agg: 'sum' } },
      value_count: { amount: { agg: 'value_count' } },
    },
  },
  getNonScriptedFields: () => fields,
  getFormatterForFieldNoDefault: () => ({ params: () => ({}) }),
} as unknown as DataView;

const mockFieldToIndexPatternField = (
  spec: Record<string, string | string[] | boolean | undefined | RuntimeField>
) => {
  return new DataViewField(spec as unknown as DataViewField['spec']);
};

const runtimeField: RuntimeField = { type: 'long', script: { source: "emit('Hello');" } };
const fields = [
  {
    name: 'Elastic',
    displayName: 'Elastic',
    searchable: true,
    esTypes: ['keyword'],
    isUserEditable: true,
  },
  { name: 'timestamp', displayName: 'timestamp', esTypes: ['date'], isUserEditable: true },
  {
    name: 'conflictingField',
    displayName: 'conflictingField',
    esTypes: ['keyword', 'long'],
    isUserEditable: true,
  },
  { name: 'amount', displayName: 'amount', esTypes: ['long'], isUserEditable: true },
  {
    name: 'runtime',
    displayName: 'runtime',
    runtimeField,
    esTypes: ['long'],
    type: 'number',
  },
].map(mockFieldToIndexPatternField);

const mockedServices = {
  userEditPermission: false,
  openModal: () => ({ onClose: new Promise<void>(() => {}), close: async () => {} }),
  theme: {} as any,
};

describe('IndexedFieldsTable', () => {
  test('should render normally', async () => {
    const component: ShallowWrapper<any, Readonly<{}>, React.Component<{}, {}, any>> = shallow(
      <IndexedFieldsTable
        fields={fields}
        indexPattern={indexPattern}
        helpers={helpers}
        fieldWildcardMatcher={() => {
          return () => false;
        }}
        indexedFieldTypeFilter={[]}
        schemaFieldTypeFilter={[]}
        fieldFilter=""
        {...mockedServices}
      />
    );

    await new Promise((resolve) => process.nextTick(resolve));
    component.update();

    expect(component).toMatchSnapshot();
  });

  test('should filter based on the query bar', async () => {
    const component: ShallowWrapper<any, Readonly<{}>, React.Component<{}, {}, any>> = shallow(
      <IndexedFieldsTable
        fields={fields}
        indexPattern={indexPattern}
        helpers={helpers}
        fieldWildcardMatcher={() => {
          return () => false;
        }}
        indexedFieldTypeFilter={[]}
        schemaFieldTypeFilter={[]}
        fieldFilter=""
        {...mockedServices}
      />
    );

    await new Promise((resolve) => process.nextTick(resolve));
    component.setProps({ fieldFilter: 'Elast' });
    component.update();

    expect(component).toMatchSnapshot();
  });

  test('should filter based on the type filter', async () => {
    const component: ShallowWrapper<any, Readonly<{}>, React.Component<{}, {}, any>> = shallow(
      <IndexedFieldsTable
        fields={fields}
        indexPattern={indexPattern}
        helpers={helpers}
        fieldWildcardMatcher={() => {
          return () => false;
        }}
        indexedFieldTypeFilter={[]}
        schemaFieldTypeFilter={[]}
        fieldFilter=""
        {...mockedServices}
      />
    );

    await new Promise((resolve) => process.nextTick(resolve));
    component.setProps({ indexedFieldTypeFilter: ['date'] });
    component.update();

    expect(component).toMatchSnapshot();
  });

  test('should filter based on the schema filter', async () => {
    const component: ShallowWrapper<any, Readonly<{}>, React.Component<{}, {}, any>> = shallow(
      <IndexedFieldsTable
        fields={fields}
        indexPattern={indexPattern}
        helpers={helpers}
        fieldWildcardMatcher={() => {
          return () => false;
        }}
        indexedFieldTypeFilter={[]}
        schemaFieldTypeFilter={[]}
        fieldFilter=""
        {...mockedServices}
      />
    );

    await new Promise((resolve) => process.nextTick(resolve));
    component.setProps({ schemaFieldTypeFilter: ['runtime'] });
    component.update();

    expect(component).toMatchSnapshot();
  });

  describe('IndexedFieldsTable with rollup index pattern', () => {
    test('should render normally', async () => {
      const component: ShallowWrapper<any, Readonly<{}>, React.Component<{}, {}, any>> = shallow(
        <IndexedFieldsTable
          fields={fields}
          indexPattern={rollupIndexPattern}
          helpers={helpers}
          fieldWildcardMatcher={() => {
            return () => false;
          }}
          indexedFieldTypeFilter={[]}
          schemaFieldTypeFilter={[]}
          fieldFilter=""
          {...mockedServices}
        />
      );

      await new Promise((resolve) => process.nextTick(resolve));
      component.update();

      expect(component).toMatchSnapshot();
    });
  });
});
