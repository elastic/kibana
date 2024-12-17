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
import { GridRow, GridRowProps } from './grid_row';
import { gridLayoutStateManagerMock, mockRenderPanelContents } from '../test_utils/mocks';
import { getSampleLayout } from '../test_utils/sample_layout';

describe('GridRow', () => {
  const setInteractionEvent = jest.fn();

  const renderGridRow = (propsOverrides: Partial<GridRowProps> = {}) => {
    return render(
      <GridRow
        rowIndex={0}
        renderPanelContents={mockRenderPanelContents}
        setInteractionEvent={setInteractionEvent}
        gridLayoutStateManager={gridLayoutStateManagerMock}
        {...propsOverrides}
      />
    );
  };

  it('renders all the panels in a row', () => {
    renderGridRow();
    const firstRowPanels = Object.values(getSampleLayout()[0].panels);
    firstRowPanels.forEach((panel) => {
      expect(screen.getByLabelText(`panelId:${panel.id}`)).toBeInTheDocument();
    });
  });

  it('does not show the panels in a row that is collapsed', async () => {
    renderGridRow({ rowIndex: 1 });

    expect(screen.getAllByText(/panel content/)).toHaveLength(1);

    const collapseButton = screen.getByRole('button', { name: /toggle collapse/i });
    await userEvent.click(collapseButton);

    expect(screen.queryAllByText(/panel content/)).toHaveLength(0);
  });
});
