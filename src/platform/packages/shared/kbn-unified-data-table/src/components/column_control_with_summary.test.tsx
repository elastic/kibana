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
import userEvent from '@testing-library/user-event';
import { EuiThemeProvider } from '@elastic/eui';
import { ColumnControlWithSummary } from './column_control_with_summary';

describe('ColumnControlWithSummary', () => {
  it('injects the Pin summary toggle above the Columns popover content', async () => {
    const onChangeShowSummaryColumn = jest.fn();

    render(
      <EuiThemeProvider>
        <ColumnControlWithSummary
          columnControl={
            <div data-test-subj="columnsPopover">
              <div>Column list</div>
            </div>
          }
          showSummaryColumn={false}
          isSummaryColumnToggleDisabled={false}
          onChangeShowSummaryColumn={onChangeShowSummaryColumn}
        />
      </EuiThemeProvider>
    );

    expect(screen.getByTestId('columnSelectorSummaryToggle')).toBeVisible();
    expect(screen.getByText('Pin summary')).toBeVisible();
    expect(screen.getByText('Column list')).toBeVisible();

    await userEvent.click(screen.getByTestId('columnSelectorShowSummaryColumn'));

    expect(onChangeShowSummaryColumn).toHaveBeenCalledWith(true);
  });
});
