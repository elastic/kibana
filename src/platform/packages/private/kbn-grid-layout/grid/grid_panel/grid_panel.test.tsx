/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { EuiThemeProvider } from '@elastic/eui';
import { act, render, screen } from '@testing-library/react';
import { GridPanel, type GridPanelProps } from './grid_panel';
import { getGridLayoutStateManagerMock, mockRenderPanelContents } from '../test_utils/mocks';
import { GridLayoutContext, type GridLayoutContextType } from '../use_grid_layout_context';

describe('GridPanel', () => {
  const renderGridPanel = (overrides?: {
    propsOverrides?: Partial<GridPanelProps>;
    contextOverrides?: Partial<GridLayoutContextType>;
  }) => {
    const contextValue = {
      renderPanelContents: mockRenderPanelContents,
      gridLayoutStateManager: getGridLayoutStateManagerMock(),
      ...(overrides?.contextOverrides ?? {}),
    } as GridLayoutContextType;
    const panelProps = {
      panelId: 'panel1',
      sectionId: 'first',
      ...(overrides?.propsOverrides ?? {}),
    };
    const { rerender, ...rtlRest } = render(
      <EuiThemeProvider>
        <GridLayoutContext.Provider value={contextValue}>
          <GridPanel {...panelProps} />
        </GridLayoutContext.Provider>
      </EuiThemeProvider>
    );

    return {
      ...rtlRest,
      rerender: (newOverrides?: {
        propsOverrides?: Partial<GridPanelProps>;
        contextOverrides?: Partial<GridLayoutContextType>;
      }) => {
        return rerender(
          <EuiThemeProvider>
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
          </EuiThemeProvider>
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

  describe('while dragged', () => {
    const dragPanel = (lockActivePanelToGrid: boolean) => {
      const gridLayoutStateManager = getGridLayoutStateManagerMock();
      gridLayoutStateManager.runtimeSettings$.next({
        ...gridLayoutStateManager.runtimeSettings$.getValue(),
        lockActivePanelToGrid,
      });
      renderGridPanel({ contextOverrides: { gridLayoutStateManager } });
      const panelDiv = gridLayoutStateManager.panelRefs.current.panel1!;
      const event = {
        type: 'drag' as const,
        id: 'panel1',
        targetSection: 'main-0',
        panelDiv,
        sensorType: 'mouse' as const,
        position: { top: 100, left: 100, right: 300, bottom: 200 },
        sensorOffsets: { top: 0, left: 0, right: 0, bottom: 0 },
      };
      // the first event is skipped so clicks can get through before the drag starts
      act(() => {
        gridLayoutStateManager.activePanelEvent$.next(event);
        gridLayoutStateManager.activePanelEvent$.next(event);
      });
      return panelDiv;
    };

    it('follows the pointer by default', () => {
      expect(dragPanel(false).style.position).toBe('fixed');
    });

    it('stays on its grid cells when locked to the grid', () => {
      const panelDiv = dragPanel(true);
      expect(panelDiv).toHaveClass('kbnGridPanel--active');
      expect(panelDiv.style.position).toBe('');
      expect(panelDiv.style.gridColumnStart).toBe('1');
    });
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
