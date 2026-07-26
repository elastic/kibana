/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { IndexedFieldItem } from '../../types';
import React from 'react';
import userEvent from '@testing-library/user-event';
import { coreMock, overlayServiceMock } from '@kbn/core/public/mocks';
import { createStubDataView } from '@kbn/data-views-plugin/public/data_views/data_view.stub';
import {
  getConflictModalContent,
  renderFieldName,
  showDelete,
  TableWithoutPersist as Table,
} from './table';
import { renderWithI18n } from '@kbn/test-jest-helpers';
import { screen } from '@testing-library/react';

const coreStart = coreMock.createStart();

const indexPattern = createStubDataView({
  spec: {
    timeFieldName: 'timestamp',
    title: 'test-data-view',
  },
});

const createIndexedField = ({
  name,
  ...field
}: Pick<IndexedFieldItem, 'name'> & Partial<IndexedFieldItem>): IndexedFieldItem => ({
  displayName: name,
  excluded: false,
  hasRuntime: false,
  info: [],
  isMapped: true,
  isUserEditable: true,
  kbnType: 'string',
  name,
  type: 'keyword',
  ...field,
});

const items = [
  createIndexedField({
    name: 'Elastic',
    searchable: true,
    type: 'name',
  }),
  createIndexedField({
    kbnType: 'date',
    name: 'timestamp',
    type: 'date',
  }),
  createIndexedField({
    conflictDescriptions: { keyword: ['index_a'], long: ['index_b'] },
    kbnType: 'conflict',
    name: 'conflictingField',
    type: 'text, long',
  }),
  createIndexedField({
    hasRuntime: true,
    isMapped: false,
    kbnType: 'text',
    name: 'customer',
    type: 'keyword',
  }),
  createIndexedField({
    hasRuntime: true,
    isMapped: false,
    isUserEditable: false,
    kbnType: 'text',
    name: 'noedit',
    type: 'keyword',
  }),
];

const mixedTypeItem = createIndexedField({
  name: 'mixedType',
  type: 'keyword, constant_keyword',
});

const primitiveRuntimeField = createIndexedField({
  hasRuntime: true,
  isMapped: false,
  name: 'runtimePrimitive',
  runtimeField: {
    type: 'keyword',
  },
});

const compositeRuntimeField = createIndexedField({
  hasRuntime: true,
  isMapped: false,
  name: 'runtimeComposite',
  runtimeField: {
    type: 'composite',
  },
});

const compositeRuntimeDefinition = createIndexedField({
  hasRuntime: true,
  isMapped: false,
  name: 'runtimeCompositeDefinition',
  runtimeField: {
    type: 'composite',
  },
  type: 'composite',
});

const baseProps: Pick<React.ComponentProps<typeof Table>, 'euiTablePersist'> = {
  euiTablePersist: {
    onTableChange: jest.fn(),
    pageSize: 10,
    sorting: { sort: { direction: 'asc', field: 'name' } },
  },
};

const renderTable = ({
  deleteField = jest.fn(),
  editField = jest.fn(),
  tableItems = items,
}: {
  deleteField?: React.ComponentProps<typeof Table>['deleteField'];
  editField?: React.ComponentProps<typeof Table>['editField'];
  tableItems?: IndexedFieldItem[];
} = {}) =>
  renderWithI18n(
    <Table
      {...baseProps}
      deleteField={deleteField}
      editField={editField}
      indexPattern={indexPattern}
      items={tableItems}
      openModal={overlayServiceMock.createStartContract().openModal}
      startServices={coreStart}
    />
  );

describe('Table', () => {
  beforeEach(() => {
    jest.spyOn(console, 'warn').mockImplementation(() => {}); // Silent EUI warnings during tests
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('should render normally', async () => {
    renderTable();

    expect(await screen.findByText('Elastic')).toBeVisible();
    expect(screen.getByText('timestamp')).toBeVisible();
    expect(screen.getByText('conflictingField')).toBeVisible();
    expect(screen.getByText('customer')).toBeVisible();
    expect(screen.getByText('noedit')).toBeVisible();
  });

  it('should render normal field name', async () => {
    renderWithI18n(renderFieldName(items[0]));

    expect(await screen.findByText('String')).toBeVisible();
    expect(screen.getByTestId('field-name-Elastic')).toHaveTextContent('Elastic');
  });

  it('should render timestamp field name', async () => {
    renderWithI18n(renderFieldName(items[1], indexPattern.timeFieldName));

    expect(await screen.findByText('Date')).toBeVisible();
    expect(screen.getByTestId('field-name-timestamp')).toHaveTextContent('timestamp');
    expect(screen.getByText('Primary time field')).toBeVisible();
  });

  it('should render the boolean template (true)', async () => {
    renderTable();

    expect(await screen.findByText('Is searchable')).toBeVisible();
  });

  it('should render the boolean template (false)', async () => {
    renderTable();

    expect((await screen.findByText('conflictingField')).closest('tr')).not.toHaveTextContent(
      'Is searchable'
    );
  });

  it('should render normal type', async () => {
    renderTable();

    expect((await screen.findByText('Elastic')).closest('tr')).toHaveTextContent('name');
  });

  it('should render conflicting type', async () => {
    renderTable();

    const conflictingFieldRow = (await screen.findByText('conflictingField')).closest('tr');
    expect(conflictingFieldRow).toHaveTextContent('text, long');
    expect(conflictingFieldRow).toHaveTextContent('Conflict');
  });

  it('should render mixed, non-conflicting type', async () => {
    renderTable({ tableItems: [mixedTypeItem] });

    const mixedTypeRow = (await screen.findByText('mixedType')).closest('tr');
    expect(mixedTypeRow).toHaveTextContent('keyword, constant_keyword');
    expect(mixedTypeRow).not.toHaveTextContent('Conflict');
  });

  it('should allow edits', async () => {
    const user = userEvent.setup();
    const editField = jest.fn();

    renderTable({ editField });

    await user.click(screen.getAllByTestId('editFieldFormat')[0]);

    expect(editField).toHaveBeenCalled();
  });

  it('should not allow edit or deletion for user with only read access', async () => {
    renderTable({ tableItems: [items[4]] });

    const noEditRow = (await screen.findByText('noedit')).closest('tr');
    expect(noEditRow).toBeVisible();
    expect(screen.queryByTestId('editFieldFormat')).not.toBeInTheDocument();
    expect(screen.queryByTestId('deleteField')).not.toBeInTheDocument();
  });

  it('renders mapped field name', async () => {
    const mappedField = createIndexedField({ name: 'customer' });

    renderWithI18n(renderFieldName(mappedField));

    expect(await screen.findByText('String')).toBeVisible();
    expect(screen.getByTestId('field-name-customer')).toHaveTextContent('customer');
  });

  it('renders runtime field name with runtime info', async () => {
    const runtimeField = createIndexedField({
      hasRuntime: true,
      isMapped: false,
      name: 'customer',
    });

    renderWithI18n(renderFieldName(runtimeField));

    expect(await screen.findByText('String')).toBeVisible();
    expect(screen.getByTestId('field-name-customer')).toHaveTextContent('customer');
    expect(screen.getByText('Info')).toBeVisible();
  });

  it('render conflict summary modal ', () => {
    renderWithI18n(
      getConflictModalContent({
        closeFn: () => {},
        conflictDescriptions: { keyword: ['index_a'], long: ['index_b'] },
        fieldName: 'message',
      })
    );

    expect(screen.getByText('This field has a type conflict')).toBeVisible();
    expect(screen.getByText(/The type of the/)).toHaveTextContent('message');
    expect(screen.getByText('keyword')).toBeVisible();
    expect(screen.getByText('index_a')).toBeVisible();
    expect(screen.getByText('long')).toBeVisible();
    expect(screen.getByText('index_b')).toBeVisible();
    expect(screen.getByText('Close')).toBeVisible();
  });

  it('showDelete', () => {
    // indexed field
    expect(showDelete(items[0])).toBe(false);
    // runtime field - primitive type
    expect(showDelete(primitiveRuntimeField)).toBe(true);
    // runtime field - composite subfield
    expect(showDelete(compositeRuntimeField)).toBe(false);
    // runtime field - composite definition
    expect(showDelete(compositeRuntimeDefinition)).toBe(true);
  });
});
