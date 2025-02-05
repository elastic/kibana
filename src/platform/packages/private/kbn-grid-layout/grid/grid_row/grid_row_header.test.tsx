/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */
import React from 'react';
import { cloneDeep, omit } from 'lodash';

import { RenderResult, act, render, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { gridLayoutStateManagerMock } from '../test_utils/mocks';
import { getSampleLayout } from '../test_utils/sample_layout';
import { GridLayoutStateManager } from '../types';
import { GridRowHeader, GridRowHeaderProps } from './grid_row_header';

const toggleIsCollapsed = jest
  .fn()
  .mockImplementation((rowIndex: number, gridLayoutStateManager: GridLayoutStateManager) => {
    const newLayout = cloneDeep(gridLayoutStateManager.gridLayout$.value);
    newLayout[rowIndex].isCollapsed = !newLayout[rowIndex].isCollapsed;
    gridLayoutStateManager.gridLayout$.next(newLayout);
  });

describe('GridRowHeader', () => {
  const renderGridRowHeader = (propsOverrides: Partial<GridRowHeaderProps> = {}) => {
    return render(
      <GridRowHeader
        rowIndex={0}
        toggleIsCollapsed={() => toggleIsCollapsed(0, gridLayoutStateManagerMock)}
        gridLayoutStateManager={gridLayoutStateManagerMock}
        {...propsOverrides}
      />
    );
  };

  beforeEach(() => {
    toggleIsCollapsed.mockClear();
    act(() => {
      gridLayoutStateManagerMock.gridLayout$.next(getSampleLayout());
    });
  });

  it('renders the panel count', async () => {
    const component = renderGridRowHeader();
    const initialCount = component.getByTestId('kbnGridRowHeader--panelCount');
    expect(initialCount.textContent).toBe('(8 panels)');

    act(() => {
      const currentRow = gridLayoutStateManagerMock.gridLayout$.getValue()[0];
      gridLayoutStateManagerMock.gridLayout$.next([
        {
          ...currentRow,
          panels: {
            panel1: currentRow.panels.panel1,
          },
        },
      ]);
    });

    await waitFor(() => {
      const updatedCount = component.getByTestId('kbnGridRowHeader--panelCount');
      expect(updatedCount.textContent).toBe('(1 panel)');
    });
  });

  it('clicking title calls `toggleIsCollapsed`', async () => {
    const component = renderGridRowHeader();
    const title = component.getByTestId('kbnGridRowTitle');

    expect(toggleIsCollapsed).toBeCalledTimes(0);
    expect(gridLayoutStateManagerMock.gridLayout$.getValue()[0].isCollapsed).toBe(false);
    await userEvent.click(title);
    expect(toggleIsCollapsed).toBeCalledTimes(1);
    expect(gridLayoutStateManagerMock.gridLayout$.getValue()[0].isCollapsed).toBe(true);
  });

  describe('title editor', () => {
    const setTitle = async (component: RenderResult) => {
      const input = component.getByTestId('euiInlineEditModeInput');
      expect(input.getAttribute('value')).toBe('Large section');
      await userEvent.click(input);
      await userEvent.keyboard(' 123');
      expect(input.getAttribute('value')).toBe('Large section 123');
    };

    it('clicking on edit icon triggers inline title editor and does not toggle collapsed', async () => {
      const component = renderGridRowHeader();
      const editIcon = component.getByTestId('kbnGridRowTitle--edit');

      expect(component.queryByTestId('kbnGridRowTitle--editor')).not.toBeInTheDocument();
      expect(gridLayoutStateManagerMock.gridLayout$.getValue()[0].isCollapsed).toBe(false);
      await userEvent.click(editIcon);
      expect(component.getByTestId('kbnGridRowTitle--editor')).toBeInTheDocument();
      expect(toggleIsCollapsed).toBeCalledTimes(0);
      expect(gridLayoutStateManagerMock.gridLayout$.getValue()[0].isCollapsed).toBe(false);
    });

    it('can update the title', async () => {
      const component = renderGridRowHeader();
      expect(component.getByTestId('kbnGridRowTitle').textContent).toBe('Large section');
      expect(gridLayoutStateManagerMock.gridLayout$.getValue()[0].title).toBe('Large section');

      const editIcon = component.getByTestId('kbnGridRowTitle--edit');
      await userEvent.click(editIcon);
      await setTitle(component);
      const saveButton = component.getByTestId('euiInlineEditModeSaveButton');
      await userEvent.click(saveButton);

      expect(component.queryByTestId('kbnGridRowTitle--editor')).not.toBeInTheDocument();
      expect(component.getByTestId('kbnGridRowTitle').textContent).toBe('Large section 123');
      expect(gridLayoutStateManagerMock.gridLayout$.getValue()[0].title).toBe('Large section 123');
    });

    it('clicking on cancel closes the inline title editor without updating title', async () => {
      const component = renderGridRowHeader();
      const editIcon = component.getByTestId('kbnGridRowTitle--edit');
      await userEvent.click(editIcon);

      await setTitle(component);
      const cancelButton = component.getByTestId('euiInlineEditModeCancelButton');
      await userEvent.click(cancelButton);

      expect(component.queryByTestId('kbnGridRowTitle--editor')).not.toBeInTheDocument();
      expect(component.getByTestId('kbnGridRowTitle').textContent).toBe('Large section');
      expect(gridLayoutStateManagerMock.gridLayout$.getValue()[0].title).toBe('Large section');
    });
  });
});
