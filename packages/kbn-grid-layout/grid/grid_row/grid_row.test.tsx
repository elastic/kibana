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
import { BehaviorSubject } from 'rxjs';
import { GridLayoutData, GridLayoutStateManager, RuntimeGridSettings } from '../types';

const layout: GridLayoutData = [
  {
    title: 'Large section',
    isCollapsed: false,
    panels: {
      panel1: {
        id: 'panel1',
        row: 0,
        column: 0,
        width: 12,
        height: 6,
      },
      panel2: {
        id: 'panel2',
        row: 6,
        column: 0,
        width: 8,
        height: 4,
      },
      panel3: {
        id: 'panel3',
        row: 6,
        column: 8,
        width: 12,
        height: 4,
      },
      panel4: {
        id: 'panel4',
        row: 10,
        column: 0,
        width: 48,
        height: 4,
      },
      panel5: {
        id: 'panel5',
        row: 0,
        column: 12,
        width: 36,
        height: 6,
      },
      panel6: {
        id: 'panel6',
        row: 6,
        column: 24,
        width: 24,
        height: 4,
      },
      panel7: {
        id: 'panel7',
        row: 6,
        column: 20,
        width: 4,
        height: 2,
      },
      panel8: {
        id: 'panel8',
        row: 8,
        column: 20,
        width: 4,
        height: 2,
      },
    },
  },
  {
    title: 'Small section',
    isCollapsed: false,
    panels: {
      panel9: {
        id: 'panel9',
        row: 0,
        column: 0,
        width: 12,
        height: 16,
      },
    },
  },
  {
    title: 'Another small section',
    isCollapsed: false,
    panels: {
      panel10: {
        id: 'panel10',
        row: 0,
        column: 24,
        width: 12,
        height: 6,
      },
    },
  },
];

describe('GridRow', () => {
  const mockRenderPanelContents = jest.fn((panelId) => (
    <div aria-label={panelId}>panel content {panelId}</div>
  ));
  const setInteractionEvent = jest.fn();
  const DASHBOARD_MARGIN_SIZE = 8;
  const DASHBOARD_GRID_HEIGHT = 20;
  const DASHBOARD_GRID_COLUMN_COUNT = 48;
  const gridLayout$ = new BehaviorSubject<GridLayoutData>(layout);
  const gridSettings = {
    gutterSize: DASHBOARD_MARGIN_SIZE,
    rowHeight: DASHBOARD_GRID_HEIGHT,
    columnCount: DASHBOARD_GRID_COLUMN_COUNT,
  };

  const runtimeSettings$ = new BehaviorSubject<RuntimeGridSettings>({
    ...gridSettings,
    columnPixelWidth: 0,
  });

  const mockGridLayoutStateManager = {
    expandedPanelId$: new BehaviorSubject<string | undefined>(undefined),
    isMobileView$: new BehaviorSubject<boolean>(false),
    gridLayout$,
    runtimeSettings$,
    panelRefs: { current: [] },
    rowRefs: { current: [] },
    interactionEvent$: new BehaviorSubject(undefined),
    activePanel$: new BehaviorSubject(undefined),
    gridDimensions$: new BehaviorSubject({ width: 600, height: 900 }),
  } as unknown as GridLayoutStateManager;

  const renderGridRow = (propsOverrides: Partial<GridRowProps> = {}) => {
    return render(
      <GridRow
        rowIndex={0}
        renderPanelContents={mockRenderPanelContents}
        setInteractionEvent={setInteractionEvent}
        gridLayoutStateManager={mockGridLayoutStateManager}
        {...propsOverrides}
      />
    );
  };

  it('renders all the panels in a row', () => {
    renderGridRow();
    Object.values(layout[0].panels).forEach((panel) => {
      expect(screen.getByLabelText(panel.id)).toBeInTheDocument();
    });
  });

  it('does not show the panels in a row that is collapsed', async () => {
    renderGridRow({ rowIndex: 1 });

    expect(screen.getAllByText(/panel content/)).toHaveLength(1);

    const collapseButton = screen.getByRole('button', { name: /toggle collapse/i });
    await userEvent.click(collapseButton);

    expect(screen.queryAllByText(/panel content/)).toHaveLength(0);
  });
  describe('focus management - tabbing through the panels preserves the focus from left to the right, top to bottom', () => {
    it('on initializing', () => {});
    it('after reordering some panels', () => {});
    it('after deleting a panel', () => {});
    it('after adding a panel', () => {});
  });
});
