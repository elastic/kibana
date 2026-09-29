/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { vi } from 'vitest';
import type { MockedFunction } from 'vitest';

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { I18nProvider } from '@kbn/i18n-react';
import { OutputFilterRow } from './output_filter_row';
import {
  useOutputFilterReadContext,
  useOutputFilterActionContext,
} from '../../../../contexts/output_filter_context';

vi.mock('../../../../contexts/output_filter_context', () => {
  const mocked = {
    useOutputFilterReadContext: vi.fn(),
    useOutputFilterActionContext: vi.fn(),
  };
  return { ...mocked, default: mocked };
});

vi.mock('./filter_help_modal', () => {
  const mocked = {
    FilterHelpModal: () => <div data-test-subj="filterHelpModal" />,
  };
  return { ...mocked, default: mocked };
});

const mockUseOutputFilterReadContext = useOutputFilterReadContext as MockedFunction<
  typeof useOutputFilterReadContext
>;
const mockUseOutputFilterActionContext = useOutputFilterActionContext as MockedFunction<
  typeof useOutputFilterActionContext
>;

const mockSetExpression = vi.fn();
const mockSetMode = vi.fn();
const mockSetInvertMatch = vi.fn();

const defaultReadContext = {
  expression: '',
  mode: 'jq' as const,
  invertMatch: false,
  isExpanded: true,
};

const renderComponent = () =>
  render(
    <I18nProvider>
      <OutputFilterRow />
    </I18nProvider>
  );

beforeEach(() => {
  vi.clearAllMocks();
  mockUseOutputFilterReadContext.mockReturnValue(defaultReadContext);
  mockUseOutputFilterActionContext.mockReturnValue({
    setExpression: mockSetExpression,
    setMode: mockSetMode,
    setInvertMatch: mockSetInvertMatch,
    setIsExpanded: vi.fn(),
  });
});

describe('OutputFilterRow', () => {
  describe('JQ mode (default)', () => {
    it('renders the JQ input with JQ placeholder', () => {
      renderComponent();
      expect(screen.getByTestId('filterJq')).toBeInTheDocument();
      expect(screen.getByTestId('filterJq')).toHaveAttribute('placeholder', 'JQ expression');
    });

    it('does not render the invert match button in JQ mode', () => {
      renderComponent();
      expect(screen.queryByTestId('invertFilter')).not.toBeInTheDocument();
    });
  });

  describe('Regex mode', () => {
    beforeEach(() => {
      mockUseOutputFilterReadContext.mockReturnValue({
        ...defaultReadContext,
        mode: 'regex',
      });
    });

    it('renders the regex input with regex placeholder', () => {
      renderComponent();
      expect(screen.getByTestId('filterRegex')).toBeInTheDocument();
      expect(screen.getByTestId('filterRegex')).toHaveAttribute(
        'placeholder',
        'Regular expression'
      );
    });

    it('renders the invert match button in regex mode', () => {
      renderComponent();
      expect(screen.getByTestId('invertFilter')).toBeInTheDocument();
    });

    it('clicking invert match updates draft state — setInvertMatch not called until Apply', async () => {
      renderComponent();
      await userEvent.click(screen.getByTestId('invertFilter'));
      expect(mockSetInvertMatch).not.toHaveBeenCalled();
    });
  });

  describe('mode switching', () => {
    it('changing mode resets expression and invertMatch', async () => {
      renderComponent();
      const select = screen.getByRole('combobox');
      await userEvent.selectOptions(select, 'regex');
      expect(mockSetMode).toHaveBeenCalledWith('regex');
      expect(mockSetExpression).toHaveBeenCalledWith('');
      expect(mockSetInvertMatch).toHaveBeenCalledWith(false);
    });
  });

  describe('applying filter', () => {
    it('pressing Enter calls setExpression with the typed value', async () => {
      renderComponent();
      const input = screen.getByTestId('filterJq');
      await userEvent.type(input, 'keys');
      fireEvent.keyDown(input, { key: 'Enter' });
      expect(mockSetExpression).toHaveBeenCalledWith('keys');
    });

    it('clicking Apply calls setExpression with the typed value', async () => {
      renderComponent();
      const input = screen.getByTestId('filterJq');
      await userEvent.type(input, '.hits.total');
      await userEvent.click(screen.getByTestId('consoleOutputFilterApply'));
      expect(mockSetExpression).toHaveBeenCalledWith('.hits.total');
    });

    it('clearing the input immediately calls setExpression with empty string', async () => {
      mockUseOutputFilterReadContext.mockReturnValue({
        ...defaultReadContext,
        expression: 'keys',
      });
      renderComponent();
      const input = screen.getByTestId('filterJq');
      await userEvent.clear(input);
      expect(mockSetExpression).toHaveBeenCalledWith('');
    });
  });

  describe('help modal', () => {
    it('clicking the ? button shows the help modal', async () => {
      renderComponent();
      expect(screen.queryByTestId('filterHelpModal')).not.toBeInTheDocument();
      await userEvent.click(screen.getByRole('button', { name: /filter expression help/i }));
      expect(screen.getByTestId('filterHelpModal')).toBeInTheDocument();
    });
  });
});
