/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { act, fireEvent, render, waitFor, screen, within } from '@testing-library/react';
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
    renderComponent();

    expect(screen.getByTestId('show-field-browser')).toBeInTheDocument();
  });

  describe('toggleShow', () => {
    it('should NOT render the fields browser until the Fields button is clicked', () => {
      renderComponent();

      expect(screen.queryByTestId('fields-browser-container')).toBeNull();
    });

    it('should render the fields browser when the Fields button is clicked', async () => {
      renderComponent();

      screen.getByTestId('show-field-browser').click();
      await waitFor(() => {
        // the container is rendered now
        expect(screen.getByTestId('fields-browser-container')).toBeInTheDocument();
      });
      // by default, no categories are selected
      expect(screen.getByTestId('category-badges')).toHaveTextContent('');
      // the view: all button is shown by default
      screen.getByText('View: all');
    });
  });

  describe('updateSelectedCategoryIds', () => {
    it('should add a selected category, which creates the category badge', async () => {
      renderComponent();

      screen.getByTestId('show-field-browser').click();
      await waitFor(() => {
        expect(screen.getByTestId('fields-browser-container')).toBeInTheDocument();
      });

      await act(async () => {
        screen.getByTestId('categories-filter-button').click();
      });
      await act(async () => {
        screen.getByTestId('categories-selector-option-base').click();
      });

      expect(screen.getByTestId('category-badge-base')).toBeInTheDocument();
    });

    it('should remove a selected category, which deletes the category badge', async () => {
      renderComponent();

      screen.getByTestId('show-field-browser').click();
      await waitFor(() => {
        expect(screen.getByTestId('fields-browser-container')).toBeInTheDocument();
      });

      await act(async () => {
        screen.getByTestId('categories-filter-button').click();
      });
      await act(async () => {
        screen.getByTestId('categories-selector-option-base').click();
      });
      expect(screen.getByTestId('category-badge-base')).toBeInTheDocument();

      await act(async () => {
        screen.getByTestId('category-badge-unselect-base').click();
      });
      expect(screen.queryByTestId('category-badge-base')).toBeNull();
    });

    it('should update the available categories according to the search input', async () => {
      renderComponent();

      screen.getByTestId('show-field-browser').click();
      await waitFor(() => {
        expect(screen.getByTestId('fields-browser-container')).toBeInTheDocument();
      });

      screen.getByTestId('categories-filter-button').click();
      await waitForEuiPopoverOpen();
      expect(screen.getByTestId('categories-selector-option-base')).toBeVisible();

      fireEvent.change(screen.getByTestId('field-search'), { target: { value: 'client' } });
      await waitFor(() => {
        expect(screen.queryByTestId('categories-selector-option-base')).toBeNull();
      });
      expect(screen.getByTestId('categories-selector-option-client')).toBeInTheDocument();
    });
  });

  it('should render the Fields Browser button as a settings gear when the isEventViewer prop is true', () => {
    const isEventViewer = true;
    renderComponent({ isEventViewer });

    expect(screen.getByTestId('show-field-browser')).toBeInTheDocument();
  });

  it('should render the Fields Browser button as a settings gear when the isEventViewer prop is false', () => {
    const isEventViewer = false;

    renderComponent({ isEventViewer, width: FIELD_BROWSER_WIDTH });
    expect(screen.getByTestId('show-field-browser')).toBeInTheDocument();
  });

  describe('options.preselectedCategoryIds', () => {
    it("should render fields list narrowed to preselected category id's", async () => {
      const agentFieldsCount = Object.keys(mockBrowserFields.agent?.fields || {}).length;

      // Narrowing the selection to 'agent' only
      renderComponent({ options: { preselectedCategoryIds: ['agent'] } });

      screen.getByTestId('show-field-browser').click();

      // Wait for the modal to open
      await waitFor(() => {
        expect(screen.getByTestId('fields-browser-container')).toBeInTheDocument();
      });

      // Check if there are only 4 fields in the table
      const table = screen.queryByTestId('field-table');
      expect(table).not.toBe(null);
      const rowGroups = within(table!).getAllByRole('rowgroup');
      const tbody = rowGroups[1];
      const dataRows = within(tbody).getAllByRole('row');
      expect(dataRows).toHaveLength(agentFieldsCount);
    });
  });
});
