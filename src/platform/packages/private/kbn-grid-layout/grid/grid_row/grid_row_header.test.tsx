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
    const gridLayoutStateManager =
      propsOverrides.gridLayoutStateManager ?? gridLayoutStateManagerMock;
    return render(
      <GridRowHeader
        rowIndex={0}
        toggleIsCollapsed={() => toggleIsCollapsed(0, gridLayoutStateManager)}
        gridLayoutStateManager={gridLayoutStateManager}
        {...omit(propsOverrides, 'gridLayoutStateManager')}
      />
    );
  };

  it('renders the panel count', async () => {
    const gridLayoutStateManager = gridLayoutStateManagerMock;
    const component = renderGridRowHeader({ gridLayoutStateManager });
    const initialCount = component.getByTestId('kbnGridRowHeader--panelCount');
    expect(initialCount.textContent).toBe('(8 panels)');

    act(() => {
      gridLayoutStateManager.gridLayout$.next([
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
          },
        },
      ]);
    });

    await waitFor(() => {
      const updatedCount = component.getByTestId('kbnGridRowHeader--panelCount');
      expect(updatedCount.textContent).toBe('(1 panel)');
    });
  });

  describe('title editor', () => {
    const gridLayoutStateManager = gridLayoutStateManagerMock;

    afterEach(() => {
      act(() => {
        gridLayoutStateManager.gridLayout$.next(getSampleLayout());
      });
    });

    const setTitle = async (component: RenderResult) => {
      const input = component.getByTestId('euiInlineEditModeInput');
      expect(input.getAttribute('value')).toBe('Large section');
      await userEvent.click(input);
      await userEvent.keyboard(' 123');
      expect(input.getAttribute('value')).toBe('Large section 123');
    };

    it('clicking on edit icon triggers inline title editor', async () => {
      const component = renderGridRowHeader({ gridLayoutStateManager });
      const editIcon = component.getByTestId('kbnGridRowTitle--edit');

      expect(component.queryByTestId('kbnGridRowTitle--editor')).not.toBeInTheDocument();
      await userEvent.click(editIcon);
      expect(component.getByTestId('kbnGridRowTitle--editor')).toBeInTheDocument();
    });

    it('can update the title', async () => {
      const component = renderGridRowHeader({ gridLayoutStateManager });
      expect(component.getByTestId('kbnGridRowTitle').textContent).toBe('Large section');
      expect(gridLayoutStateManager.gridLayout$.getValue()[0].title).toBe('Large section');

      const editIcon = component.getByTestId('kbnGridRowTitle--edit');
      await userEvent.click(editIcon);
      await setTitle(component);
      const saveButton = component.getByTestId('euiInlineEditModeSaveButton');
      await userEvent.click(saveButton);

      expect(component.queryByTestId('kbnGridRowTitle--editor')).not.toBeInTheDocument();
      expect(component.getByTestId('kbnGridRowTitle').textContent).toBe('Large section 123');
      expect(gridLayoutStateManager.gridLayout$.getValue()[0].title).toBe('Large section 123');
    });

    it('clicking on cancel closes the inline title editor without updating title', async () => {
      const component = renderGridRowHeader({ gridLayoutStateManager });
      const editIcon = component.getByTestId('kbnGridRowTitle--edit');
      await userEvent.click(editIcon);

      await setTitle(component);
      const cancelButton = component.getByTestId('euiInlineEditModeCancelButton');
      await userEvent.click(cancelButton);

      expect(component.queryByTestId('kbnGridRowTitle--editor')).not.toBeInTheDocument();
      expect(component.getByTestId('kbnGridRowTitle').textContent).toBe('Large section');
      expect(gridLayoutStateManager.gridLayout$.getValue()[0].title).toBe('Large section');
    });
  });
});
