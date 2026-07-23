/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import userEvent from '@testing-library/user-event';
import { renderWithI18n } from '@kbn/test-jest-helpers';
import { screen } from '@testing-library/react';
import { TitleDocsPopover } from './title_docs_popover';
import { waitForEuiPopoverOpen } from '@elastic/eui/test-env/test/rtl';

describe('DataViewEditor TitleDocsPopover', () => {
  it('should render normally', async () => {
    const user = userEvent.setup();

    renderWithI18n(<TitleDocsPopover />);

    expect(screen.getByTestId('indexPatternDocsButton')).toBeVisible();
    expect(screen.queryByTestId('indexPatternDocsPopoverContent')).not.toBeInTheDocument();

    await user.click(screen.getByTestId('indexPatternDocsButton'));
    await waitForEuiPopoverOpen();

    expect(screen.getByTestId('indexPatternDocsPopoverContent')).toBeVisible();
    expect(
      screen.getByText(
        'An index pattern is a string that you use to match one or more data streams, indices, or aliases.'
      )
    ).toBeVisible();
  });
});
