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
import { GridPanel, type GridPanelProps } from './grid_panel';
import { gridLayoutStateManagerMock, mockRenderPanelContents } from '../test_utils/mocks';
import { GridLayoutContext, type GridLayoutContextType } from '../use_grid_layout_context';

describe('GridPanel', () => {
  const renderGridPanel = (
    propsOverrides: Partial<GridPanelProps> = {},
    contextOverrides: Partial<GridLayoutContextType> = {}
  ) => {
    return render(
      <GridLayoutContext.Provider
        value={
          {
            renderPanelContents: mockRenderPanelContents,
            gridLayoutStateManager: gridLayoutStateManagerMock,
            ...contextOverrides,
          } as GridLayoutContextType
        }
      >
        <GridPanel panelId="panel1" rowIndex={0} {...propsOverrides} />
      </GridLayoutContext.Provider>
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
