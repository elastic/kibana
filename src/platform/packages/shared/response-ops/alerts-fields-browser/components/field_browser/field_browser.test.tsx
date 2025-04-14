/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { act, fireEvent, render, waitFor } from '@testing-library/react';
import { waitForEuiPopoverOpen } from '@elastic/eui/lib/test/rtl';
import { mockBrowserFields } from '../../mock';
import { FIELD_BROWSER_WIDTH } from '../../helpers';
import { FieldBrowserComponent } from './field_browser';
import type { FieldBrowserProps } from '../../types';

const defaultProps: FieldBrowserProps = {
  browserFields: mockBrowserFields,
  columnIds: [],
  onToggleColumn: jest.fn(),
  onResetColumns: jest.fn(),
};

const renderComponent = (props: Partial<FieldBrowserProps> = {}) =>
  render(<FieldBrowserComponent {...{ ...defaultProps, ...props }} />);

describe('FieldsBrowser', () => {
  it('should render the Fields button, which displays the fields browser on click', () => {
    const result = renderComponent();

    expect(result.getByTestId('show-field-browser')).toBeInTheDocument();
  });

  describe('toggleShow', () => {
    it('should NOT render the fields browser until the Fields button is clicked', () => {
      const result = renderComponent();

      expect(result.queryByTestId('fields-browser-container')).toBeNull();
    });

    it('should render the fields browser when the Fields button is clicked', async () => {
      const result = renderComponent();

      result.getByTestId('show-field-browser').click();
      await waitFor(() => {
        // the container is rendered now
        expect(result.getByTestId('fields-browser-container')).toBeInTheDocument();
        // by default, no categories are selected
        expect(result.getByTestId('category-badges')).toHaveTextContent('');
        // the view: all button is shown by default
        result.getByText('View: all');
      });
    });
  });

  describe('updateSelectedCategoryIds', () => {
    it('should add a selected category, which creates the category badge', async () => {
      const result = renderComponent();

      result.getByTestId('show-field-browser').click();
      await waitFor(() => {
        expect(result.getByTestId('fields-browser-container')).toBeInTheDocument();
      });

      await act(async () => {
        result.getByTestId('categories-filter-button').click();
      });
      await act(async () => {
        result.getByTestId('categories-selector-option-base').click();
      });

      expect(result.getByTestId('category-badge-base')).toBeInTheDocument();
    });

    it('should remove a selected category, which deletes the category badge', async () => {
      const result = renderComponent();

      result.getByTestId('show-field-browser').click();
      await waitFor(() => {
        expect(result.getByTestId('fields-browser-container')).toBeInTheDocument();
      });

      await act(async () => {
        result.getByTestId('categories-filter-button').click();
      });
      await act(async () => {
        result.getByTestId('categories-selector-option-base').click();
      });
      expect(result.getByTestId('category-badge-base')).toBeInTheDocument();

      await act(async () => {
        result.getByTestId('category-badge-unselect-base').click();
      });
      expect(result.queryByTestId('category-badge-base')).toBeNull();
    });

    it('should update the available categories according to the search input', async () => {
      const result = renderComponent();

      result.getByTestId('show-field-browser').click();
      await waitFor(() => {
        expect(result.getByTestId('fields-browser-container')).toBeInTheDocument();
      });

      result.getByTestId('categories-filter-button').click();
      await waitForEuiPopoverOpen();
      expect(result.getByTestId('categories-selector-option-base')).toBeVisible();

      fireEvent.change(result.getByTestId('field-search'), { target: { value: 'client' } });
      await waitFor(() => {
        expect(result.queryByTestId('categories-selector-option-base')).toBeNull();
      });
      expect(result.queryByTestId('categories-selector-option-client')).toBeInTheDocument();
    });
  });

  it('should render the Fields Browser button as a settings gear when the isEventViewer prop is true', () => {
    const isEventViewer = true;
    const result = renderComponent({ isEventViewer });

    expect(result.getByTestId('show-field-browser')).toBeInTheDocument();
  });

  it('should render the Fields Browser button as a settings gear when the isEventViewer prop is false', () => {
    const isEventViewer = false;

    const result = renderComponent({ isEventViewer, width: FIELD_BROWSER_WIDTH });
    expect(result.getByTestId('show-field-browser')).toBeInTheDocument();
  });

  describe('options.preselectedCategoryIds', () => {
    it("should render fields list narrowed to preselected category id's", async () => {
      const agentFieldsCount = Object.keys(mockBrowserFields.agent?.fields || {}).length;

      // Narrowing the selection to 'agent' only
      const result = renderComponent({ options: { preselectedCategoryIds: ['agent'] } });

      result.getByTestId('show-field-browser').click();

      // Wait for the modal to open
      await waitFor(() => {
        expect(result.getByTestId('fields-browser-container')).toBeInTheDocument();
      });

      // Check if there are only 4 fields in the table
      expect(result.queryByTestId('field-table')?.querySelectorAll('tbody tr')).toHaveLength(
        agentFieldsCount
      );
    });
  });
});
