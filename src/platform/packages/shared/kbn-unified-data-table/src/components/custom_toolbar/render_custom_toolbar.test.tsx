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
import { EuiThemeProvider } from '@elastic/eui';
import { renderCustomToolbar, getRenderCustomToolbarWithElements } from './render_custom_toolbar';

describe('renderCustomToolbar', () => {
  it('should render successfully', () => {
    expect(
      renderCustomToolbar({
        toolbarProps: {
          hasRoomForGridControls: true,
          columnControl: 'column',
          columnSortingControl: 'columnSorting',
          displayControl: 'display',
          fullScreenControl: 'fullScreen',
          keyboardShortcutsControl: 'keyboard',
        },
        gridProps: { additionalControls: 'additional' },
      })
    ).toMatchSnapshot();
  });

  it('should render correctly for smaller screens', () => {
    expect(
      renderCustomToolbar({
        toolbarProps: {
          hasRoomForGridControls: false,
          columnControl: 'column',
          columnSortingControl: 'columnSorting',
          displayControl: 'display',
          fullScreenControl: 'fullScreen',
          keyboardShortcutsControl: 'keyboard',
        },
        gridProps: { additionalControls: 'additional' },
      })
    ).toMatchSnapshot();
  });

  it('should render correctly with an element', () => {
    expect(
      getRenderCustomToolbarWithElements({
        leftSide: <div>left</div>,
        bottomSection: <div>bottom</div>,
      })({
        toolbarProps: {
          hasRoomForGridControls: true,
          columnControl: 'column',
          columnSortingControl: 'columnSorting',
          displayControl: 'display',
          fullScreenControl: 'fullScreen',
          keyboardShortcutsControl: 'keyboard',
        },
        gridProps: { additionalControls: 'additional' },
      })
    ).toMatchSnapshot();
  });

  it('places center content between the left side and the controls when there is room', () => {
    render(
      <EuiThemeProvider>
        {getRenderCustomToolbarWithElements({
          leftSide: <div>left</div>,
          centerContent: <span>center message</span>,
        })({
          toolbarProps: {
            hasRoomForGridControls: true,
            columnControl: 'column',
            columnSortingControl: 'columnSorting',
            displayControl: 'display',
            fullScreenControl: 'fullScreen',
            keyboardShortcutsControl: 'keyboard',
          },
          gridProps: { additionalControls: 'additional' },
        })}
      </EuiThemeProvider>
    );

    const toolbarText = screen.getByTestId('unifiedDataTableToolbar').textContent ?? '';
    expect(toolbarText.indexOf('left')).toBeLessThan(toolbarText.indexOf('center message'));
    expect(toolbarText.indexOf('center message')).toBeLessThan(toolbarText.indexOf('additional'));
    expect(screen.getByTestId('unifiedDataTableToolbarCenterContent')).toBeInTheDocument();
  });

  it('omits center content when there is no room for grid controls', () => {
    render(
      <EuiThemeProvider>
        {getRenderCustomToolbarWithElements({
          leftSide: <div>left</div>,
          centerContent: <span>center message</span>,
        })({
          toolbarProps: {
            hasRoomForGridControls: false,
            columnControl: 'column',
            columnSortingControl: 'columnSorting',
            displayControl: 'display',
            fullScreenControl: 'fullScreen',
            keyboardShortcutsControl: 'keyboard',
          },
          gridProps: { additionalControls: 'additional' },
        })}
      </EuiThemeProvider>
    );

    expect(screen.getByText('left')).toBeInTheDocument();
    expect(screen.queryByText('center message')).not.toBeInTheDocument();
    expect(screen.queryByTestId('unifiedDataTableToolbarCenterContent')).not.toBeInTheDocument();
  });
});
