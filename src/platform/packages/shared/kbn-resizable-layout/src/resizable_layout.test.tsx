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
import { createHtmlPortalNode, InPortal, OutPortal } from 'react-reverse-portal';
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

  describe('focus restoration when the mode changes', () => {
    const PortalLayout = ({ mode }: { mode: ResizableLayoutMode }) => {
      const [flexPanelNode] = React.useState(() => createHtmlPortalNode());

      return (
        <>
          <InPortal node={flexPanelNode}>
            <button type="button">Toggle</button>
          </InPortal>
          <ResizableLayout
            direction={ResizableLayoutDirection.Horizontal}
            fixedPanel={<div>Fixed panel</div>}
            fixedPanelSize={200}
            flexPanel={<OutPortal node={flexPanelNode} />}
            minFixedPanelSize={100}
            minFlexPanelSize={100}
            mode={mode}
          />
        </>
      );
    };

    it.each([
      [ResizableLayoutMode.Resizable, ResizableLayoutMode.Single],
      [ResizableLayoutMode.Single, ResizableLayoutMode.Resizable],
      [ResizableLayoutMode.Resizable, ResizableLayoutMode.Static],
      [ResizableLayoutMode.Static, ResizableLayoutMode.Single],
    ])(
      'should keep focus on an element moved between panels when switching from %s to %s',
      (fromMode, toMode) => {
        const { rerender } = render(<PortalLayout mode={fromMode} />);
        const button = screen.getByRole('button', { name: 'Toggle' });
        button.focus();

        rerender(<PortalLayout mode={toMode} />);

        expect(screen.getByRole('button', { name: 'Toggle' })).toBe(button);
        expect(button).toHaveFocus();
      }
    );

    it('should not move focus when the focused element is outside the layout', () => {
      const { rerender } = render(
        <>
          <input aria-label="Outside" />
          <PortalLayout mode={ResizableLayoutMode.Resizable} />
        </>
      );
      const outside = screen.getByRole('textbox', { name: 'Outside' });
      outside.focus();

      rerender(
        <>
          <input aria-label="Outside" />
          <PortalLayout mode={ResizableLayoutMode.Single} />
        </>
      );

      expect(outside).toHaveFocus();
    });
  });
});
