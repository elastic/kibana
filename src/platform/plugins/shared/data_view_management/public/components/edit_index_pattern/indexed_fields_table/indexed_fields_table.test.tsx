/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { RuntimeField } from '@kbn/data-views-plugin/common';
import React from 'react';
import { coreMock } from '@kbn/core/public/mocks';
import { createStubDataView } from '@kbn/data-views-plugin/public/data_views/data_view.stub';
import { DataViewField, DataViewType } from '@kbn/data-views-plugin/public';
import { getFieldInfo } from '../../utils';
import { IndexedFieldsTable } from './indexed_fields_table';
import { renderWithI18n } from '@kbn/test-jest-helpers';
import { screen } from '@testing-library/react';

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
    type: 'string',
    isUserEditable: true,
  },
  {
    name: 'timestamp',
    displayName: 'timestamp',
    esTypes: ['date'],
    type: 'date',
    isUserEditable: true,
  },
  {
    name: 'conflictingField',
    displayName: 'conflictingField',
    esTypes: ['keyword', 'long'],
    type: 'conflict',
    isUserEditable: true,
  },
  {
    name: 'amount',
    displayName: 'amount',
    esTypes: ['long'],
    type: 'number',
    isUserEditable: true,
  },
  {
    name: 'runtime',
    displayName: 'runtime',
    runtimeField,
    esTypes: ['long'],
    type: 'number',
  },
].map(mockFieldToIndexPatternField);

const fieldsMap = Object.fromEntries(fields.map((field) => [field.name, field.spec]));

const helpers = {
  editField: jest.fn(),
  deleteField: jest.fn(),
  // getFieldInfo handles non rollups as well
  getFieldInfo,
};

const indexPattern = createStubDataView({
  spec: {
    title: 'test-data-view',
    fields: fieldsMap,
  },
});

const mockedServices = {
  openModal: () => ({ onClose: new Promise<void>(() => {}), close: async () => {} }),
  theme: {},
  userEditPermission: false,
};

const rollupIndexPattern = createStubDataView({
  spec: {
    title: 'rollup-data-view',
    fields: fieldsMap,
    type: DataViewType.ROLLUP,
    typeMeta: {
      params: {
        rollup_index: 'rollup',
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
  },
});

const startServices = coreMock.createStart();

// EUI field icons load asynchronously, so each test waits for a visible icon before
// asserting the table contents.
const expectFieldTypeIconVisible = async (label: string) => {
  expect((await screen.findAllByTitle(label))[0]).toBeVisible();
};

const expectHiddenFields = (fieldNames: string[]) => {
  fieldNames.forEach((fieldName) => {
    expect(screen.queryByText(fieldName)).not.toBeInTheDocument();
  });
};

const expectVisibleFields = (fieldNames: string[]) => {
  fieldNames.forEach((fieldName) => {
    expect(screen.getByText(fieldName)).toBeVisible();
  });
};

const renderIndexedFieldsTable = (
  props: Partial<React.ComponentProps<typeof IndexedFieldsTable>>
) => {
  renderWithI18n(
    <IndexedFieldsTable
      compositeRuntimeFields={{}}
      fieldFilter=""
      fields={fields}
      fieldWildcardMatcher={jest.fn(() => () => false)}
      helpers={helpers}
      indexedFieldTypeFilter={[]}
      indexPattern={indexPattern}
      schemaFieldTypeFilter={[]}
      startServices={startServices}
      {...mockedServices}
      {...props}
    />
  );
};

describe('IndexedFieldsTable', () => {
  beforeEach(() => {
    jest.spyOn(console, 'warn').mockImplementation(() => {}); // Silent EUI warnings during tests
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('should render normally', async () => {
    renderIndexedFieldsTable({});

    await expectFieldTypeIconVisible('Keyword');
    expect(screen.getByTestId('tableHeaderCell_displayName_0')).toBeVisible();
    expectVisibleFields(['Elastic', 'timestamp', 'conflictingField', 'amount', 'runtime']);
  });

  it('should filter based on the query bar', async () => {
    renderIndexedFieldsTable({ fieldFilter: 'Elast' });

    await expectFieldTypeIconVisible('Keyword');
    expectVisibleFields(['Elastic']);
    expectHiddenFields(['timestamp', 'conflictingField', 'amount', 'runtime']);
  });

  it('should filter based on the type filter', async () => {
    renderIndexedFieldsTable({ indexedFieldTypeFilter: ['date'] });

    await expectFieldTypeIconVisible('Date');
    expectVisibleFields(['timestamp']);
    expectHiddenFields(['Elastic', 'conflictingField', 'amount', 'runtime']);
  });

  it('should filter based on the schema filter', async () => {
    renderIndexedFieldsTable({ schemaFieldTypeFilter: ['runtime'] });

    await expectFieldTypeIconVisible('Number');
    expectVisibleFields(['runtime']);
    expectHiddenFields(['Elastic', 'timestamp', 'conflictingField', 'amount']);
  });

  describe('IndexedFieldsTable with rollup index pattern', () => {
    it('should render normally', async () => {
      renderIndexedFieldsTable({ indexPattern: rollupIndexPattern });

      await expectFieldTypeIconVisible('Keyword');
      expectVisibleFields(['Elastic', 'timestamp', 'conflictingField', 'amount', 'runtime']);
    });
  });
});
