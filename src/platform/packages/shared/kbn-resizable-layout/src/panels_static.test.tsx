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
import { PanelsStatic } from './panels_static';
import { render, screen } from '@testing-library/react';
import { ResizableLayoutDirection } from '../types';

describe('Panels static', () => {
  const renderComponent = ({
    direction = ResizableLayoutDirection.Vertical,
    fixedPanel = <div>Fixed panel</div>,
    flexPanel = <div>Flex panel</div>,
    hideFixedPanel = false,
  }: {
    direction?: ResizableLayoutDirection;
    fixedPanel?: ReactElement;
    flexPanel?: ReactElement;
    hideFixedPanel?: boolean;
  } = {}) => {
    return render(
      <PanelsStatic
        direction={direction}
        fixedPanel={fixedPanel}
        flexPanel={flexPanel}
        hideFixedPanel={hideFixedPanel}
      />
    );
  };

  it('should render both panels when hideFixedPanel is false', () => {
    renderComponent();

    expect(screen.getByText('Fixed panel')).toBeVisible();
    expect(screen.getByText('Flex panel')).toBeVisible();
  });

  it('should render only flex panel when hideFixedPanel is true', () => {
    renderComponent({ hideFixedPanel: true });

    expect(screen.queryByText('Fixed panel')).not.toBeInTheDocument();
    expect(screen.getByText('Flex panel')).toBeVisible();
  });

  it('should pass direction "column" to EuiFlexGroup when direction is ResizableLayoutDirection.Vertical', () => {
    renderComponent({ direction: ResizableLayoutDirection.Vertical });

    expect(screen.getByTestId('resizableLayoutStaticContainer')).toHaveStyle({
      flexDirection: 'column',
    });
  });

  it('should pass direction "row" to EuiFlexGroup when direction is ResizableLayoutDirection.Horizontal', () => {
    renderComponent({ direction: ResizableLayoutDirection.Horizontal });

    expect(screen.getByTestId('resizableLayoutStaticContainer')).toHaveStyle({
      flexDirection: 'row',
    });
  });
});
