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
import { GridPanel, GridPanelProps } from './grid_panel';
import { gridLayoutStateManagerMock, mockRenderPanelContents } from '../test_utils/mocks';

describe('GridPanel', () => {
  const renderGridPanel = (propsOverrides: Partial<GridPanelProps> = {}) => {
    return render(
      <GridPanel
        panelId="panel1"
        rowIndex={0}
        renderPanelContents={mockRenderPanelContents}
        gridLayoutStateManager={gridLayoutStateManagerMock}
        {...propsOverrides}
      />
    );
  };

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('renders panel contents', () => {
    renderGridPanel();
    expect(screen.getByText('panel content panel1')).toBeInTheDocument();
    expect(mockRenderPanelContents).toHaveBeenCalledWith('panel1', expect.any(Function));
  });
});
