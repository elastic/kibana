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
  const renderGridPanel = (overrides?: {
    propsOverrides?: Partial<GridPanelProps>;
    contextOverrides?: Partial<GridLayoutContextType>;
  }) => {
    const contextValue = {
      renderPanelContents: mockRenderPanelContents,
      gridLayoutStateManager: gridLayoutStateManagerMock,
      ...(overrides?.contextOverrides ?? {}),
    } as GridLayoutContextType;
    const panelProps = {
      panelId: 'panel1',
      rowIndex: 0,
      ...(overrides?.propsOverrides ?? {}),
    };
    const { rerender, ...rtlRest } = render(
      <GridLayoutContext.Provider value={contextValue}>
        <GridPanel {...panelProps} />
      </GridLayoutContext.Provider>
    );

    return {
      ...rtlRest,
      rerender: (newOverrides?: {
        propsOverrides?: Partial<GridPanelProps>;
        contextOverrides?: Partial<GridLayoutContextType>;
      }) => {
        return rerender(
          <GridLayoutContext.Provider
            value={
              {
                ...contextValue,
                ...(newOverrides?.contextOverrides ?? {}),
              } as GridLayoutContextType
            }
          >
            <GridPanel {...panelProps} {...(newOverrides?.propsOverrides ?? {})} />
          </GridLayoutContext.Provider>
        );
      },
    };
  };

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('renders panel contents', () => {
    renderGridPanel();
    expect(screen.getByText('panel content panel1')).toBeInTheDocument();
    expect(mockRenderPanelContents).toHaveBeenCalledWith('panel1', undefined);
  });

  describe('use custom drag handle', () => {
    it('renders default drag handle when `useCustomDragHandle` is false | undefined', () => {
      const panel = renderGridPanel();
      expect(panel.queryByTestId('kbnGridPanel--dragHandle')).toBeInTheDocument();

      panel.rerender({ contextOverrides: { useCustomDragHandle: false } });
      expect(panel.queryByTestId('kbnGridPanel--dragHandle')).toBeInTheDocument();
    });

    it('does not render default drag handle when `useCustomDragHandle` is true and calls setDragHandles', () => {
      const panel = renderGridPanel({ contextOverrides: { useCustomDragHandle: true } });
      expect(panel.queryByTestId('kbnGridPanel--dragHandle')).not.toBeInTheDocument();
      expect(mockRenderPanelContents).toHaveBeenCalledWith('panel1', expect.any(Function));
    });
  });
});
