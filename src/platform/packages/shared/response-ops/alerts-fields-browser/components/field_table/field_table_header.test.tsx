/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { render } from '@testing-library/react';
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
      const result = render(<FieldTableHeader {...defaultProps} />);

      expect(result.getByTestId('fields-showing').textContent).toBe('Showing 0 fields');
    });

    it('should render field table with one singular field count value', () => {
      const result = render(<FieldTableHeader {...defaultProps} fieldCount={1} />);

      expect(result.getByTestId('fields-showing').textContent).toBe('Showing 1 field');
    });
    it('should render field table with multiple fields count value', () => {
      const result = render(<FieldTableHeader {...defaultProps} fieldCount={4} />);

      expect(result.getByTestId('fields-showing').textContent).toBe('Showing 4 fields');
    });
  });

  describe('View selected', () => {
    beforeEach(() => {
      mockOnFilterSelectedChange.mockClear();
    });

    it('should render "view all" option when filterSelected is not enabled', () => {
      const result = render(<FieldTableHeader {...defaultProps} filterSelectedEnabled={false} />);

      expect(result.getByTestId('viewSelectorButton').textContent).toBe('View: all');
    });

    it('should render "view selected" option when filterSelected is not enabled', () => {
      const result = render(<FieldTableHeader {...defaultProps} filterSelectedEnabled={true} />);

      expect(result.getByTestId('viewSelectorButton').textContent).toBe('View: selected');
    });

    it('should open the view selector with button click', async () => {
      const result = render(<FieldTableHeader {...defaultProps} />);

      expect(result.queryByTestId('viewSelectorMenu')).not.toBeInTheDocument();
      expect(result.queryByTestId('viewSelectorOption-all')).not.toBeInTheDocument();
      expect(result.queryByTestId('viewSelectorOption-selected')).not.toBeInTheDocument();

      result.getByTestId('viewSelectorButton').click();
      await waitForEuiPopoverOpen();

      expect(result.getByTestId('viewSelectorMenu')).toBeInTheDocument();
      expect(result.getByTestId('viewSelectorOption-all')).toBeInTheDocument();
      expect(result.getByTestId('viewSelectorOption-selected')).toBeInTheDocument();
    });

    it('should callback when "view all" option is clicked', async () => {
      const result = render(<FieldTableHeader {...defaultProps} filterSelectedEnabled={false} />);

      result.getByTestId('viewSelectorButton').click();
      await waitForEuiPopoverOpen();
      result.getByTestId('viewSelectorOption-all').click();
      expect(mockOnFilterSelectedChange).toHaveBeenCalledWith(false);
    });

    it('should callback when "view selected" option is clicked', async () => {
      const result = render(<FieldTableHeader {...defaultProps} filterSelectedEnabled={false} />);

      result.getByTestId('viewSelectorButton').click();
      await waitForEuiPopoverOpen();
      result.getByTestId('viewSelectorOption-selected').click();
      expect(mockOnFilterSelectedChange).toHaveBeenCalledWith(true);
    });
  });
});
