/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { type ComponentProps } from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { CascadeRowHeaderPrimitive } from './cascade_row_header';
import { DataCascadeProvider } from '../../../../store_provider';

type CascadeRowHeaderPrimitiveProps = ComponentProps<typeof CascadeRowHeaderPrimitive>;

const cascadeGroups = ['group1', 'group2'];

const initialGroupColumn = [cascadeGroups[0]];

const defaultProps: CascadeRowHeaderPrimitiveProps = {
  isGroupNode: true,
  onCascadeGroupNodeExpanded: jest.fn(),
  onCascadeGroupNodeCollapsed: jest.fn(),
  rowInstance: {
    id: '1',
    depth: 0,
    original: { id: '1', name: 'Test', [initialGroupColumn[0]]: 'value' },
    getToggleSelectedHandler: jest.fn(),
    getToggleExpandedHandler: jest.fn(),
    getIsExpanded: jest.fn(() => true),
    subRows: [],
  } as unknown as CascadeRowHeaderPrimitiveProps['rowInstance'],
  rowHeaderTitleSlot: () => <div>Test</div>,
  size: 'm',
};

describe('CascadeRowHeaderPrimitive', () => {
  const renderComponent = ({
    ...overrides
  }: Partial<ComponentProps<typeof CascadeRowHeaderPrimitive>> = {}) => {
    return render(
      <DataCascadeProvider cascadeGroups={cascadeGroups} initialGroupColumn={initialGroupColumn}>
        <CascadeRowHeaderPrimitive {...defaultProps} {...overrides} />
      </DataCascadeProvider>
    );
  };

  it('should render', () => {
    renderComponent();
    expect(screen.queryByTestId(`${defaultProps.rowInstance.id}-row-header`)).toBeInTheDocument();
  });

  describe('group node behaviour', () => {
    it('should invoke the onCascadeGroupNodeCollapsed callback when row is collapsed', async () => {
      const onCascadeGroupNodeCollapsed = jest.fn();

      const componentProps = {
        ...defaultProps,
        rowInstance: {
          ...defaultProps.rowInstance,
          getIsExpanded: jest.fn(() => false),
        },
      };

      renderComponent({
        isGroupNode: true,
        onCascadeGroupNodeCollapsed,
        rowInstance: componentProps.rowInstance,
      });

      await waitFor(() => {
        expect(onCascadeGroupNodeCollapsed).toHaveBeenCalledWith({
          row: defaultProps.rowInstance.original,
          nodePath: initialGroupColumn,
          nodePathMap: {
            [initialGroupColumn[0]]: defaultProps.rowInstance.original[initialGroupColumn[0]],
          },
        });
      });
    });
  });
});
