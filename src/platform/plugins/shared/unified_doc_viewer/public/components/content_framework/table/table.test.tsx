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
import { ContentFrameworkTable, ContentFrameworkTableProps } from '.';
import { buildDataViewMock, shallowMockedFields } from '@kbn/discover-utils/src/__mocks__';
import { buildHitMock } from '../../../__mocks__';

// Mock EUI hooks and components if needed
jest.mock('@elastic/eui', () => ({
  ...jest.requireActual('@elastic/eui'),
  useEuiTheme: () => ({ euiTheme: { font: { weight: { semiBold: 700 } } } }),
}));

// Mock plugin services
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

// Mock utils
jest.mock('@kbn/discover-utils/src/utils/get_formatted_fields', () => ({
  getFormattedFields: () => ({
    fieldA: 'formattedA',
    fieldB: 'formattedB',
  }),
}));
jest.mock('@kbn/discover-utils/src/utils/get_flattened_fields', () => ({
  getFlattenedFields: () => ({
    fieldA: 'valueA',
    fieldB: 'valueB',
  }),
}));

const mockDataView = buildDataViewMock({
  name: 'data-view-mock',
  fields: shallowMockedFields,
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
      // No custom formatter
    },
  },
  dataView: mockDataView,
  columnsMeta: {},
  columns: ['fieldA', 'fieldB'],
  title: 'Test Table',
  filter: jest.fn(),
  onAddColumn: jest.fn(),
  onRemoveColumn: jest.fn(),
};

describe('ContentFrameworkTable', () => {
  it('renders DataGrid with correct title', () => {
    render(<ContentFrameworkTable {...defaultProps} />);
    expect(screen.getByLabelText('Test Table')).toBeInTheDocument();
  });

  it('returns null if hit.flattened is falsy', () => {
    const props = {
      ...defaultProps,
      hit: { id: 'test-id', flattened: {}, raw: {} },
    };
    const { container } = render(<ContentFrameworkTable {...props} />);
    expect(container.firstChild).toBeNull();
  });

  it('renders custom formatter for fieldA', () => {
    render(<ContentFrameworkTable {...defaultProps} />);
    expect(screen.getByText('Custom: valueA (formattedA)')).toBeInTheDocument();
  });

  it('renders default formatted value for fieldB', () => {
    render(<ContentFrameworkTable {...defaultProps} />);
    expect(screen.getByText('formattedB')).toBeInTheDocument();
  });

  it('renders field name and description in nameCellValue', async () => {
    render(<ContentFrameworkTable {...defaultProps} />);
    expect(screen.getByText('Field A Title')).toBeInTheDocument();
    expect(screen.getByText('fieldA: Custom description A')).toBeInTheDocument();
    expect(screen.getByText('Field B Title')).toBeInTheDocument();
    expect(screen.getByText('fieldB: Short desc B')).toBeInTheDocument();
  });

  it('does not render fields without value', () => {
    const props = {
      ...defaultProps,
      fieldNames: ['fieldA', 'fieldB', 'fieldC'],
      fieldConfigurations: {
        ...defaultProps.fieldConfigurations,
        fieldC: { title: 'Field C Title' },
      },
    };
    jest.mock('@kbn/discover-utils/src/utils/get_flattened_fields', () => ({
      getFlattenedFields: () => ({
        fieldA: 'valueA',
        fieldB: 'valueB',
        fieldC: null,
      }),
    }));
    render(<ContentFrameworkTable {...props} />);
    expect(screen.queryByText('Field C Title')).not.toBeInTheDocument();
  });
});
