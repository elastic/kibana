/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';
import { shallow } from 'enzyme';
import { IndexPatternField, IndexPattern, IndexPatternType } from 'src/plugins/data/public';
import { IndexedFieldsTable } from './indexed_fields_table';
import { getFieldInfo } from '../../utils';

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
} as unknown as IndexPattern;

const rollupIndexPattern = {
  type: IndexPatternType.ROLLUP,
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
} as unknown as IndexPattern;

const mockFieldToIndexPatternField = (
  spec: Record<string, string | string[] | boolean | undefined>
) => {
  return new IndexPatternField(spec as unknown as IndexPatternField['spec']);
};

const fields = [
  {
    name: 'Elastic',
    displayName: 'Elastic',
    searchable: true,
    esTypes: ['keyword'],
  },
  { name: 'timestamp', displayName: 'timestamp', esTypes: ['date'] },
  { name: 'conflictingField', displayName: 'conflictingField', esTypes: ['keyword', 'long'] },
  { name: 'amount', displayName: 'amount', esTypes: ['long'] },
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

  describe('IndexedFieldsTable with rollup index pattern', () => {
    test('should render normally', async () => {
      const component = shallow(
        <IndexedFieldsTable
          fields={fields}
          indexPattern={rollupIndexPattern}
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
  });
});
