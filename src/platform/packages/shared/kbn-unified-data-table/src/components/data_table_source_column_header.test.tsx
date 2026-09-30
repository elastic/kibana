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
import { renderWithKibanaRenderContext } from '@kbn/test-jest-helpers';
import { screen, within } from '@testing-library/react';
import { UnifiedDataTableSourceColumnHeader } from './data_table_source_column_header';

describe('UnifiedDataTableSourceColumnHeader', () => {
  it('renders column name and tooltip icon', () => {
    renderWithKibanaRenderContext(
      <UnifiedDataTableSourceColumnHeader columnDisplayName="My Column" />
    );

    const column = screen.getByText('My Column');
    expect(column).toBeVisible();
    expect(within(column).getByText('Info')).toBeVisible();
  });

  it('shows custom tooltip content and title when provided', async () => {
    const customContent = 'Custom tooltip';
    const customTitle = 'Custom title';

    renderWithKibanaRenderContext(
      <UnifiedDataTableSourceColumnHeader
        columnDisplayName="Column"
        tooltipContent={customContent}
        tooltipTitle={customTitle}
      />
    );

    const icon = screen.getByText('Info');
    await userEvent.hover(icon);

    expect(await screen.findByText(customTitle)).toBeVisible();
    expect(screen.getByText(customContent)).toBeVisible();
  });

  it('renders default column name and tooltip', async () => {
    renderWithKibanaRenderContext(<UnifiedDataTableSourceColumnHeader />);

    expect(screen.getByText('Summary')).toBeVisible();

    const icon = screen.getByText('Info');
    await userEvent.hover(icon);

    expect(await screen.findAllByText('Summary')).toHaveLength(2);
    expect(
      screen.getByText('Shows a quick view of the record using its key:value pairs.')
    ).toBeVisible();
  });
});
