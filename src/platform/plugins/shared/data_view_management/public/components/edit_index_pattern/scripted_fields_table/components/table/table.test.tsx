/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ScriptedFieldItem } from '../../types';
import React from 'react';
import { createStubDataView } from '@kbn/data-views-plugin/public/data_views/data_view.stub';
import { renderWithI18n } from '@kbn/test-jest-helpers';
import { screen } from '@testing-library/react';
import { TableWithoutPersist as Table } from './table';
import { userEvent } from '@testing-library/user-event';

const createScriptedField = ({
  displayName,
  ...field
}: ScriptedFieldItem & { displayName: string }) => ({
  displayName,
  ...field,
});

const baseProps: Pick<React.ComponentProps<typeof Table>, 'euiTablePersist'> = {
  euiTablePersist: {
    onTableChange: jest.fn(),
    pageSize: 10,
    sorting: { sort: { direction: 'asc', field: 'name' } },
  },
};

const indexPattern = Object.assign(
  createStubDataView({
    spec: {
      title: 'test-data-view',
    },
  }),
  {
    fieldFormatMap: {
      Elastic: {
        type: {
          title: 'string',
        },
      },
    },
  }
);

const items = [
  createScriptedField({
    displayName: 'Elastic',
    isUserEditable: true,
    lang: 'painless',
    name: 'Elastic',
    script: "emit('one')",
  }),
  createScriptedField({
    displayName: 'ReadonlyScriptedField',
    isUserEditable: false,
    lang: 'painless',
    name: 'ReadonlyScriptedField',
    script: "emit('two')",
  }),
];

const getActionButton = (fieldName: string, buttonIndex: number) => {
  const button = getRowByText(fieldName).querySelectorAll('button')[buttonIndex];

  if (!button) {
    throw new Error(`Unable to find action button ${buttonIndex} for field ${fieldName}`);
  }

  return button;
};

const getRowByText = (text: string) => {
  const row = screen.getByText(text).closest('tr');

  if (!row) throw new Error(`Unable to find row for ${text}`);

  return row;
};

const renderTable = ({
  deleteField = jest.fn(),
  editField = jest.fn(),
  tableItems = items,
}: {
  deleteField?: React.ComponentProps<typeof Table>['deleteField'];
  editField?: React.ComponentProps<typeof Table>['editField'];
  tableItems?: React.ComponentProps<typeof Table>['items'];
} = {}) => {
  renderWithI18n(
    <Table
      {...baseProps}
      deleteField={deleteField}
      editField={editField}
      indexPattern={indexPattern}
      items={tableItems}
    />
  );

  return { deleteField, editField };
};

describe('Table', () => {
  beforeEach(() => {
    jest.spyOn(console, 'warn').mockImplementation(() => {}); // Silent EUI warnings during tests
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('should render normally', () => {
    renderTable();

    expect(screen.getByText('Elastic')).toBeVisible();
    expect(screen.getByText('ReadonlyScriptedField')).toBeVisible();
    expect(screen.getAllByText('painless')).toHaveLength(2);
    expect(screen.getByText("emit('one')")).toBeVisible();
    expect(screen.getByText("emit('two')")).toBeVisible();
  });

  it('should render the format', () => {
    renderTable();

    expect(getRowByText('Elastic')).toHaveTextContent('string');
  });

  it('should allow edits', async () => {
    const user = userEvent.setup();
    const editField = jest.fn();

    renderTable({ editField });

    await user.click(getActionButton('Elastic', 0));

    expect(editField).toHaveBeenCalled();
  });

  it('should allow deletes', async () => {
    const user = userEvent.setup();
    const deleteField = jest.fn();

    renderTable({ deleteField });

    await user.click(getActionButton('Elastic', 1));

    expect(deleteField).toHaveBeenCalled();
  });

  it('should not allow edit or deletion for user with only read access', () => {
    renderTable({ tableItems: [items[1]] });

    expect(screen.getByText('ReadonlyScriptedField')).toBeVisible();
    expect(screen.queryByText('Edit')).not.toBeInTheDocument();
    expect(screen.queryByText('Delete')).not.toBeInTheDocument();
  });
});
