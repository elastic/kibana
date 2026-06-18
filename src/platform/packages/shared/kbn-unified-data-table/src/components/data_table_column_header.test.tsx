/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import {
  createStubDataView,
  stubLogstashDataView,
} from '@kbn/data-views-plugin/common/data_view.stub';
import { DataTableColumnHeader } from './data_table_column_header';
import { renderWithKibanaRenderContext } from '@kbn/test-jest-helpers';
import { screen } from '@testing-library/react';

const stubDataViewWithNested = createStubDataView({
  spec: {
    id: 'index_with_nested',
    fields: {
      'nested_user.lastname': {
        name: 'nested_user.lastname',
        esTypes: ['text'],
        type: 'string',
        aggregatable: false,
        searchable: true,
        subType: {
          nested: {
            path: 'nested_user',
          },
        },
      },
      'nested_user.lastname.keyword': {
        name: 'nested_user.lastname.keyword',
        esTypes: ['keyword'],
        type: 'string',
        aggregatable: true,
        searchable: true,
        subType: {
          multi: {
            parent: 'nested_user.lastname',
          },
          nested: {
            path: 'nested_user',
          },
        },
      },
    },
    title: 'index_with_nested',
  },
});

describe('DataTableColumnHeader', () => {
  it('should render a correct token', async () => {
    renderWithKibanaRenderContext(
      <DataTableColumnHeader
        columnDisplayName="bytesDisplayName"
        columnName="bytes"
        dataView={stubLogstashDataView}
        showColumnTokens
      />
    );

    expect(await screen.findByText('Number')).toBeVisible();
    expect(screen.getByText('bytesDisplayName')).toBeVisible();
  });

  it('should render a correct token for a custom column type (in case of text-based queries)', async () => {
    renderWithKibanaRenderContext(
      <DataTableColumnHeader
        columnDisplayName="bytesDisplayName"
        columnsMeta={{
          bytes: {
            type: 'string',
            esType: 'keyword',
          },
        }}
        columnName="bytes"
        dataView={stubLogstashDataView}
        showColumnTokens
      />
    );

    expect(await screen.findByText('Keyword')).toBeVisible();
    expect(screen.getByText('bytesDisplayName')).toBeVisible();
  });

  it('should not render a token for Document column', () => {
    renderWithKibanaRenderContext(
      <DataTableColumnHeader
        columnDisplayName="Document"
        columnName="_source"
        dataView={stubLogstashDataView}
        showColumnTokens
      />
    );

    expect(screen.getByText('Document')).toBeVisible();
    expect(screen.queryByText('Number')).not.toBeInTheDocument();
    expect(screen.queryByText('Keyword')).not.toBeInTheDocument();
    expect(screen.queryByText('Nested')).not.toBeInTheDocument();
  });

  it('should render the nested icon', async () => {
    renderWithKibanaRenderContext(
      <DataTableColumnHeader
        columnDisplayName="Nested User"
        columnName="nested_user"
        dataView={stubDataViewWithNested}
        showColumnTokens
      />
    );

    expect(await screen.findByText('Nested')).toBeVisible();
    expect(screen.getByText('Nested User')).toBeVisible();
  });
});
