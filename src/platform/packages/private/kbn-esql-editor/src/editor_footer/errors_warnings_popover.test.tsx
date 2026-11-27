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
import type { MonacoMessage } from '@kbn/code-editor';
import { ErrorsWarningsFooterPopover } from './errors_warnings_popover';
import { NO_TIME_FIELD_WARNING_CODE } from '../hooks/use_no_time_field_warning';

const createMessage = (message: string, code: string): MonacoMessage => ({
  message,
  code,
  startColumn: 1,
  startLineNumber: 3,
  endColumn: 5,
  endLineNumber: 3,
  severity: 4,
});

describe('ErrorsWarningsFooterPopover', () => {
  const renderPopover = (items: MonacoMessage[]) =>
    render(
      <ErrorsWarningsFooterPopover
        isPopoverOpen
        items={items}
        type="warning"
        setIsPopoverOpen={jest.fn()}
        onErrorClick={jest.fn()}
      />
    );

  it('shows the line of a warning', () => {
    renderPopover([createMessage('a warning', 'warningFromES')]);

    expect(screen.getByText('Line 3')).toBeInTheDocument();
  });

  it('does not show a line for the no time field warning', () => {
    renderPopover([createMessage('no time field', NO_TIME_FIELD_WARNING_CODE)]);

    expect(screen.getByText('no time field')).toBeInTheDocument();
    expect(screen.queryByText(/^Line/)).not.toBeInTheDocument();
  });
});
