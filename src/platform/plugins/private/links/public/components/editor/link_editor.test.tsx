/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';
import { LinkEditor } from './link_editor';

jest.mock('./link_destination', () => {
  // mock this component to prevent handleDestinationPicked from being called on mount
  return { LinkDestination: () => <>LinkDestinationMock</> };
});

describe('LinksEditor', () => {
  const nonDefaultOptions = {
    openInNewTab: true,
    useCurrentDateRange: false,
    useCurrentFilters: false,
  };

  const defaultProps = {
    link: {
      id: 'foo',
      type: 'dashboardLink' as const,
      destination: '123',
      title: 'dashboard 01',
    },
    parentDashboardId: 'test',
    onSave: jest.fn(),
    onClose: jest.fn(),
  };

  afterEach(() => {
    jest.clearAllMocks();
  });

  const getOptionAriaChecked = (option: string): string | null => {
    return screen
      .getByTestId(`dashboardDrillDownOptions--${option}--checkbox`)
      .getAttribute('aria-checked');
  };

  describe('dashboard link options', () => {
    test('starts with default when options not provided', async () => {
      render(<LinkEditor {...defaultProps} />);
      await waitFor(() => {
        expect(screen.queryByTestId('dashboardDrillDownOptions')).not.toBeNull(); // wait for lazy load
      });

      expect(getOptionAriaChecked('useCurrentFilters')).toBe('true');
      expect(getOptionAriaChecked('useCurrentDateRange')).toBe('true');
      expect(getOptionAriaChecked('openInNewTab')).toBe('false');
    });

    test('properly overrides default values when provided', async () => {
      render(
        <LinkEditor
          {...defaultProps}
          link={{
            ...defaultProps.link,
            options: nonDefaultOptions,
          }}
        />
      );
      await waitFor(() => {
        expect(screen.queryByTestId('dashboardDrillDownOptions')).not.toBeNull(); // wait for lazy load
      });

      expect(getOptionAriaChecked('useCurrentFilters')).toBe('false');
      expect(getOptionAriaChecked('useCurrentDateRange')).toBe('false');
      expect(getOptionAriaChecked('openInNewTab')).toBe('true');
    });

    test('options are persisted on edit', async () => {
      render(
        <LinkEditor
          {...defaultProps}
          link={{
            ...defaultProps.link,
            options: nonDefaultOptions,
          }}
        />
      );
      await waitFor(() => {
        expect(screen.queryByTestId('dashboardDrillDownOptions')).not.toBeNull(); // wait for lazy load
      });

      await userEvent.click(screen.getByTestId('links--linkEditor--linkLabel--input'));
      await userEvent.keyboard('test label');
      await userEvent.click(screen.getByTestId('links--linkEditor--saveBtn'));

      expect(defaultProps.onSave).toBeCalledWith({
        ...defaultProps.link,
        label: 'test label',
        options: nonDefaultOptions,
      });
    });
  });
});
