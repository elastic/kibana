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
import { SummaryColumnToggle } from './summary_column_toggle';

describe('SummaryColumnToggle', () => {
  it('calls onChange with the next checked value when enabled', async () => {
    const onChange = jest.fn();
    render(
      <SummaryColumnToggle
        checked={false}
        disabled={false}
        onChange={onChange}
        dataTestSubj="unifiedDataTableShowSummaryColumn"
      />
    );

    await userEvent.click(screen.getByTestId('unifiedDataTableShowSummaryColumn'));

    expect(onChange).toHaveBeenCalledWith(true);
  });

  it('does not call onChange when disabled', async () => {
    const onChange = jest.fn();
    render(
      <SummaryColumnToggle
        checked={true}
        disabled={true}
        onChange={onChange}
        dataTestSubj="unifiedDataTableShowSummaryColumn"
      />
    );

    await userEvent.click(screen.getByTestId('unifiedDataTableShowSummaryColumn'));

    expect(onChange).not.toHaveBeenCalled();
  });
});
