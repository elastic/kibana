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
import userEvent from '@testing-library/user-event';

jest.mock('react-use/lib/useWindowSize', () => jest.fn(() => ({ width: 1024, height: 768 })));

const buildHitMock = (
  flattened: Record<string, unknown>,
  index: string,
  dataView: unknown
): ContentFrameworkTableProps['hit'] =>
  ({
    id: 'test-id',
    raw: { _index: index },
    flattened,
    dataView,
  } as any);

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
  useResizeObserver: () => ({ width: 800, height: 0 }),
}));

jest.mock('../../../services', () => ({
  useUnifiedDocViewerServices: () => ({
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

jest.mock('@kbn/discover-utils', () => ({
  getFormattedFields: () => ({
    fieldA: 'formattedA',
    fieldB: 'formattedB',
    fieldC: 'formattedC',
  }),
  getFlattenedFields: () => ({
    fieldA: 'valueA',
    fieldB: 'valueB',
    fieldC: null,
  }),
}));

jest.mock('@kbn/unified-doc-viewer', () => {
  const ReactLib = jest.requireActual<typeof import('react')>('react');

  return {
    FieldRow: class FieldRowMock {
      public name: string;
      constructor({ name }: { name: string }) {
        this.name = name;
      }
    },
    TableGrid: ({ rows, customRenderCellValue, customRenderCellPopover, ...rest }: any) => {
      const [isPopoverOpen, setIsPopoverOpen] = ReactLib.useState(false);
      const [popover, setPopover] = ReactLib.useState<React.ReactNode>(null);

      return (
        <div data-test-subj={rest['data-test-subj'] ?? 'ContentFrameworkTableTableGrid'}>
          {rows.map((row: any, rowIndex: number) => {
            const nameCell = customRenderCellValue?.({ rowIndex, columnId: 'name' });
            const valueCell = customRenderCellValue?.({ rowIndex, columnId: 'value' });

            return (
              <div key={row.name ?? rowIndex}>
                <div>{nameCell}</div>
                <div>{valueCell}</div>
                {customRenderCellPopover ? (
                  <button
                    data-test-subj="euiDataGridCellExpandButton"
                    onClick={() => {
                      setPopover(
                        customRenderCellPopover({
                          rowIndex,
                          columnId: 'name',
                          cellActions: null,
                          DefaultCellPopover: () => null,
                          isExpandable: false,
                          closePopover: () => setIsPopoverOpen(false),
                          anchorContent: null,
                          cellContentsElement: null,
                        } as any)
                      );
                      setIsPopoverOpen(true);
                    }}
                  />
                ) : null}
              </div>
            );
          })}

          {isPopoverOpen ? <div>{popover}</div> : null}
        </div>
      );
    },
  };
});

const mockDataView = { id: 'data-view-mock', title: 'data-view-mock', fields: [] } as any;

const mockHit = buildHitMock(
  { fieldA: 'valueA', fieldB: 'valueB', fieldC: null },
  'index',
  mockDataView
);

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
    expect(screen.getByTestId('ContentFrameworkTableTableGrid')).toBeInTheDocument();
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
    const expandPopoverButton = screen.getAllByTestId('euiDataGridCellExpandButton')[0];
    await userEvent.click(expandPopoverButton);

    expect(screen.getByText('Custom description A')).toBeInTheDocument();
  });

  it('renders short description from metadata if no custom description', async () => {
    render(<ContentFrameworkTable {...defaultProps} />);

    const tableCell = screen.getByText('Field B Title');
    await userEvent.hover(tableCell);
    const expandPopoverButton = screen.getAllByTestId('euiDataGridCellExpandButton')[1];
    await userEvent.click(expandPopoverButton);

    expect(screen.getByText('Short desc B')).toBeInTheDocument();
  });
});
