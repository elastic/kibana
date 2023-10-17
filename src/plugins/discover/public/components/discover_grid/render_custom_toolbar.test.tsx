/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';
import {
  renderCustomToolbar,
  getRenderCustomToolbarWithViewModeToggle,
  getRenderCustomToolbarInEmbeddable,
} from './render_custom_toolbar';

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
      getRenderCustomToolbarWithViewModeToggle(
        <div>left</div>,
        <div>bottom</div>
      )({
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

  it('should render correctly for embeddable', () => {
    expect(
      getRenderCustomToolbarInEmbeddable(500)({
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
});
