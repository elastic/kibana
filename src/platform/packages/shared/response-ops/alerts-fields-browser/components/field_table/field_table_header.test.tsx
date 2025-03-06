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
import { waitForEuiPopoverOpen } from '@elastic/eui/lib/test/rtl';
import { FieldTableHeader, FieldTableHeaderProps } from './field_table_header';

const mockOnFilterSelectedChange = jest.fn();
const defaultProps: FieldTableHeaderProps = {
  fieldCount: 0,
  filterSelectedEnabled: false,
  onFilterSelectedChange: mockOnFilterSelectedChange,
};

describe('FieldTableHeader', () => {
  describe('FieldCount', () => {
    it('should render empty field table', () => {
      render(<FieldTableHeader {...defaultProps} />);

      expect(screen.getByTestId('fields-showing').textContent).toBe('Showing 0 fields');
    });

    it('should render field table with one singular field count value', () => {
      render(<FieldTableHeader {...defaultProps} fieldCount={1} />);

      expect(screen.getByTestId('fields-showing').textContent).toBe('Showing 1 field');
    });
    it('should render field table with multiple fields count value', () => {
      render(<FieldTableHeader {...defaultProps} fieldCount={4} />);

      expect(screen.getByTestId('fields-showing').textContent).toBe('Showing 4 fields');
    });
  });

  describe('View selected', () => {
    beforeEach(() => {
      mockOnFilterSelectedChange.mockClear();
    });

    it('should render "view all" option when filterSelected is not enabled', () => {
      render(<FieldTableHeader {...defaultProps} filterSelectedEnabled={false} />);

      expect(screen.getByTestId('viewSelectorButton').textContent).toBe('View: all');
    });

    it('should render "view selected" option when filterSelected is not enabled', () => {
      render(<FieldTableHeader {...defaultProps} filterSelectedEnabled={true} />);

      expect(screen.getByTestId('viewSelectorButton').textContent).toBe('View: selected');
    });

    it('should open the view selector with button click', async () => {
      render(<FieldTableHeader {...defaultProps} />);

      expect(screen.queryByTestId('viewSelectorMenu')).not.toBeInTheDocument();
      expect(screen.queryByTestId('viewSelectorOption-all')).not.toBeInTheDocument();
      expect(screen.queryByTestId('viewSelectorOption-selected')).not.toBeInTheDocument();

      screen.getByTestId('viewSelectorButton').click();
      await waitForEuiPopoverOpen();

      expect(screen.getByTestId('viewSelectorMenu')).toBeInTheDocument();
      expect(screen.getByTestId('viewSelectorOption-all')).toBeInTheDocument();
      expect(screen.getByTestId('viewSelectorOption-selected')).toBeInTheDocument();
    });

    it('should callback when "view all" option is clicked', async () => {
      render(<FieldTableHeader {...defaultProps} filterSelectedEnabled={false} />);

      screen.getByTestId('viewSelectorButton').click();
      await waitForEuiPopoverOpen();
      screen.getByTestId('viewSelectorOption-all').click();
      expect(mockOnFilterSelectedChange).toHaveBeenCalledWith(false);
    });

    it('should callback when "view selected" option is clicked', async () => {
      render(<FieldTableHeader {...defaultProps} filterSelectedEnabled={false} />);

      screen.getByTestId('viewSelectorButton').click();
      await waitForEuiPopoverOpen();
      screen.getByTestId('viewSelectorOption-selected').click();
      expect(mockOnFilterSelectedChange).toHaveBeenCalledWith(true);
    });
  });
});
