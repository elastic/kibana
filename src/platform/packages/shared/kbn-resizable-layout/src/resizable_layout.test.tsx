/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ReactElement } from 'react';
import React from 'react';
import { render, screen } from '@testing-library/react';
import { ResizableLayout } from './resizable_layout';
import { ResizableLayoutDirection, ResizableLayoutMode } from '../types';

describe('ResizableLayout component', () => {
  const renderComponent = ({
    fixedPanel = <div>Fixed panel</div>,
    flexPanel = <div>Flex panel</div>,
    initialFixedPanelSize = 200,
    minFixedPanelSize = 100,
    minFlexPanelSize = 100,
    mode = ResizableLayoutMode.Resizable,
  }: {
    fixedPanel?: ReactElement;
    flexPanel?: ReactElement;
    initialFixedPanelSize?: number;
    minFixedPanelSize?: number;
    minFlexPanelSize?: number;
    mode?: ResizableLayoutMode;
  } = {}) => {
    return render(
      <ResizableLayout
        direction={ResizableLayoutDirection.Vertical}
        fixedPanel={fixedPanel}
        fixedPanelSize={initialFixedPanelSize}
        flexPanel={flexPanel}
        minFixedPanelSize={minFixedPanelSize}
        minFlexPanelSize={minFlexPanelSize}
        mode={mode}
        onFixedPanelSizeChange={jest.fn()}
      />
    );
  };

  it('should show only the flex panel when mode is ResizableLayoutMode.Single', () => {
    renderComponent({ mode: ResizableLayoutMode.Single });

    expect(screen.queryByText('Fixed panel')).not.toBeInTheDocument();
    expect(screen.getByText('Flex panel')).toBeVisible();
    expect(screen.queryByTestId('resizableLayoutResizableButton')).not.toBeInTheDocument();
  });

  it('should show both panels without resize controls when mode is ResizableLayoutMode.Static', () => {
    renderComponent({ mode: ResizableLayoutMode.Static });

    expect(screen.getByText('Fixed panel')).toBeVisible();
    expect(screen.getByText('Flex panel')).toBeVisible();
    expect(screen.queryByTestId('resizableLayoutResizableButton')).not.toBeInTheDocument();
  });

  it('should show both panels with resize controls when mode is ResizableLayoutMode.Resizable', () => {
    renderComponent({ mode: ResizableLayoutMode.Resizable });

    expect(screen.getByText('Fixed panel')).toBeVisible();
    expect(screen.getByText('Flex panel')).toBeVisible();
    expect(screen.getByTestId('resizableLayoutResizableButton')).toBeVisible();
  });
});
