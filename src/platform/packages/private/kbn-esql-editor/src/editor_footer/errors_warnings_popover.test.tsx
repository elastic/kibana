/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import '@testing-library/jest-dom';
import { renderWithI18n } from '@kbn/test-jest-helpers';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { MonacoMessage } from '@kbn/monaco/src/languages/esql/language';
import { ErrorsWarningsFooterPopover } from './errors_warnings_popover';

describe('ErrorsWarningsFooterPopover', () => {
  const defaultHandlers = {
    setIsPopoverOpen: jest.fn(),
    onErrorClick: jest.fn(),
    onQuickFixClick: jest.fn(),
  };

  const errorMock = (overrides: Partial<MonacoMessage> = {}): MonacoMessage => ({
    message: 'Unknown column "col0"',
    severity: 8,
    startLineNumber: 1,
    endLineNumber: 1,
    startColumn: 1,
    endColumn: 10,
    code: 'unknownColumn',
    ...overrides,
  });

  it('renders a quick fix control when an item includes quickFix', async () => {
    const user = userEvent.setup();
    const onQuickFixClick = jest.fn();
    const item = errorMock({
      quickFix: {
        title: 'Load unmapped fields',
        fixQuery: (q: string) => q,
      },
    });

    renderWithI18n(
      <ErrorsWarningsFooterPopover
        isPopoverOpen
        items={[item]}
        type="error"
        {...defaultHandlers}
        onQuickFixClick={onQuickFixClick}
      />
    );

    const quickFixButton = screen.getByTestId('ESQLEditor-errors-warnings-content-quick-fix');
    expect(quickFixButton).toBeInTheDocument();
    expect(quickFixButton).toHaveTextContent('Load unmapped fields');

    await user.click(quickFixButton);
    expect(onQuickFixClick).toHaveBeenCalledTimes(1);
    expect(onQuickFixClick).toHaveBeenCalledWith(item);
  });

  it('does not render a quick fix control when quickFix is absent', () => {
    renderWithI18n(
      <ErrorsWarningsFooterPopover
        isPopoverOpen
        items={[errorMock()]}
        type="error"
        {...defaultHandlers}
      />
    );

    expect(
      screen.queryByTestId('ESQLEditor-errors-warnings-content-quick-fix')
    ).not.toBeInTheDocument();
  });
});
