/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import type { ContentFrameworkTableProps } from '.';
import { ContentFrameworkTable } from '.';
import { buildDataViewMock, deepMockedFields } from '@kbn/discover-utils/src/__mocks__';
import { buildHitMock } from '../../../__mocks__';
import userEvent from '@testing-library/user-event';

jest.mock('@elastic/eui', () => ({
  ...jest.requireActual('@elastic/eui'),
  useEuiTheme: () => ({
    euiTheme: {
      font: { weight: { semiBold: 700 } },
      border: { thin: '1px solid #ccc' },
      size: { xs: '12px' },
    },
  }),
  useEuiFontSize: () => ({ fontSize: '12px' }),
  euiFontSize: (_themeContext: any, size: string) => ({ fontSize: size === 's' ? '12px' : '10px' }),
}));

jest.mock('../../../plugin', () => ({
  getUnifiedDocViewerServices: () => ({
    fieldsMetadata: {
      useFieldsMetadata: () => ({
        fieldsMetadata: {
          fieldA: { short: 'Short desc A' },
          fieldB: { short: 'Short desc B' },
        },
      }),
    },
    fieldFormats: {},
  }),
}));

jest.mock('@kbn/discover-utils/src/utils/get_formatted_fields', () => ({
  getFormattedFields: () => ({
    fieldA: 'formattedA',
    fieldB: 'formattedB',
    fieldC: 'formattedC',
  }),
}));
jest.mock('@kbn/discover-utils/src/utils/get_flattened_fields', () => ({
  getFlattenedFields: () => ({
    fieldA: 'valueA',
    fieldB: 'valueB',
    fieldC: null,
  }),
}));

const mockDataView = buildDataViewMock({
  name: 'data-view-mock',
  fields: deepMockedFields,
});

const mockHit = buildHitMock({}, 'index', mockDataView);

const defaultProps: ContentFrameworkTableProps = {
  hit: mockHit,
  fieldNames: ['fieldA', 'fieldB'],
  fieldConfigurations: {
    fieldA: {
      title: 'Field A Title',
      description: 'Custom description A',
      formatter: (value, formatted) => <span>{`Custom: ${value} (${formatted})`}</span>,
    },
    fieldB: {
      title: 'Field B Title',
    },
  },
  dataView: mockDataView,
  columnsMeta: {},
  columns: ['fieldA', 'fieldB'],
  id: 'Test Table',
  filter: jest.fn(),
  onAddColumn: jest.fn(),
  onRemoveColumn: jest.fn(),
};

describe('ContentFrameworkTable', () => {
  it('renders the table grid', () => {
    render(<ContentFrameworkTable {...defaultProps} />);
    expect(screen.getByTestId('UnifiedDocViewerTableGrid')).toBeInTheDocument();
  });

  it('renders custom formatter for fieldA', () => {
    render(<ContentFrameworkTable {...defaultProps} />);
    expect(screen.getByText('Custom: valueA (formattedA)')).toBeInTheDocument();
  });

  it('renders default formatted value for fieldB', () => {
    render(<ContentFrameworkTable {...defaultProps} />);
    expect(screen.getByText('formattedB')).toBeInTheDocument();
  });

  it('does not render fields without value', () => {
    render(
      <ContentFrameworkTable
        {...defaultProps}
        fieldNames={['fieldA', 'fieldB', 'fieldC']}
        fieldConfigurations={{
          ...defaultProps.fieldConfigurations,
          fieldC: { title: 'Field C Title' },
        }}
      />
    );
    expect(screen.queryByText('Field C Title')).not.toBeInTheDocument();
  });

  it('returns null if hit.flattened is empty', () => {
    const props = {
      ...defaultProps,
      hit: { id: 'test-id', flattened: {}, raw: {} },
    };
    const { container } = render(<ContentFrameworkTable {...props} />);
    expect(container.firstChild).toBeNull();
  });

  it('renders field descriptions if present', async () => {
    render(<ContentFrameworkTable {...defaultProps} />);

    const tableCell = screen.getByText('Field A Title');
    await userEvent.hover(tableCell);
    const expandPopoverButton = screen.getByTestId('euiDataGridCellExpandButton');
    await userEvent.click(expandPopoverButton);

    expect(screen.getByText('Custom description A')).toBeInTheDocument();
  });

  it('renders short description from metadata if no custom description', async () => {
    render(<ContentFrameworkTable {...defaultProps} />);

    const tableCell = screen.getByText('Field B Title');
    await userEvent.hover(tableCell);
    const expandPopoverButton = screen.getByTestId('euiDataGridCellExpandButton');
    await userEvent.click(expandPopoverButton);

    expect(screen.getByText('Short desc B')).toBeInTheDocument();
  });
});
