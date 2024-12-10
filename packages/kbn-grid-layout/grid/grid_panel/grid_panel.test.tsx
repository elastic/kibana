/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { GridPanel, GridPanelProps } from './grid_panel';
import { gridLayoutStateManagerMock } from '../test_utils/mocks';

describe('GridPanel', () => {
  const mockRenderPanelContents = jest.fn((panelId) => <div>Panel Content {panelId}</div>);
  const mockInteractionStart = jest.fn();

  const renderGridPanel = (propsOverrides: Partial<GridPanelProps> = {}) => {
    return render(
      <GridPanel
        panelId="panel1"
        rowIndex={0}
        renderPanelContents={mockRenderPanelContents}
        interactionStart={mockInteractionStart}
        gridLayoutStateManager={gridLayoutStateManagerMock}
        {...propsOverrides}
      />
    );
  };
  afterEach(() => {
    jest.clearAllMocks();
  });

  it('renders panel contents correctly', () => {
    renderGridPanel();
    expect(screen.getByText('Panel Content panel1')).toBeInTheDocument();
  });

  describe('drag handle interaction', () => {
    it('calls `drag` interactionStart on mouse down', () => {
      renderGridPanel();
      const dragHandle = screen.getByRole('button', { name: /drag to move/i });
      fireEvent.mouseDown(dragHandle);
      expect(mockInteractionStart).toHaveBeenCalledWith('drag', expect.any(Object));
    });
    it('calls `drop` interactionStart on mouse up', () => {
      renderGridPanel();
      const dragHandle = screen.getByRole('button', { name: /drag to move/i });
      fireEvent.mouseUp(dragHandle);
      expect(mockInteractionStart).toHaveBeenCalledWith('drop', expect.any(Object));
    });
  });
  describe('resize handle interaction', () => {
    it('calls `resize` interactionStart on mouse down', () => {
      renderGridPanel();
      const resizeHandle = screen.getByRole('button', { name: /resize/i });
      fireEvent.mouseDown(resizeHandle);
      expect(mockInteractionStart).toHaveBeenCalledWith('resize', expect.any(Object));
    });
    it('calls `drop` interactionStart on mouse up', () => {
      renderGridPanel();
      const resizeHandle = screen.getByRole('button', { name: /resize/i });
      fireEvent.mouseUp(resizeHandle);
      expect(mockInteractionStart).toHaveBeenCalledWith('drop', expect.any(Object));
    });
  });
});
