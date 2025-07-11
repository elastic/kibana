/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { ReactNode } from 'react';
import React from 'react';
import { PanelsResizable } from './panels_resizable';
import { PanelsStatic } from './panels_static';
import { ResizableLayoutDirection, ResizableLayoutMode } from '../types';

export interface ResizableLayoutProps {
  /**
   * Class name for the layout container
   */
  className?: string;
  /**
   * The current layout mode
   */
  mode: ResizableLayoutMode;
  /**
   * The current layout direction
   */
  direction: ResizableLayoutDirection;
  /**
   * Current size of the fixed panel in pixels
   */
  fixedPanelSize: number;
  /**
   * Minimum size of the fixed panel in pixels
   */
  minFixedPanelSize: number;
  /**
   * Minimum size of the flex panel in pixels
   */
  minFlexPanelSize: number;
  /**
   * The fixed panel
   */
  fixedPanel: ReactNode;
  /**
   * The flex panel
   */
  flexPanel: ReactNode;
  /**
   * Class name for the resize button
   */
  resizeButtonClassName?: string;
  /**
   * Test subject for the layout container
   */
  ['data-test-subj']?: string;
  /**
   * Callback when the fixed panel size changes, receives the new size in pixels
   */
  onFixedPanelSizeChange?: (fixedPanelSize: number) => void;
}

const staticModes = [ResizableLayoutMode.Single, ResizableLayoutMode.Static];

export const ResizableLayout = ({
  className,
  mode,
  direction,
  fixedPanelSize,
  minFixedPanelSize,
  minFlexPanelSize,
  fixedPanel,
  flexPanel,
  resizeButtonClassName,
  ['data-test-subj']: dataTestSubj,
  onFixedPanelSizeChange,
}: ResizableLayoutProps) => {
  const panelsProps = { className, fixedPanel, flexPanel };

  return staticModes.includes(mode) ? (
    <PanelsStatic
      direction={direction}
      hideFixedPanel={mode === ResizableLayoutMode.Single}
      {...panelsProps}
    />
  ) : (
    <PanelsResizable
      direction={direction}
      fixedPanelSize={fixedPanelSize}
      minFixedPanelSize={minFixedPanelSize}
      minFlexPanelSize={minFlexPanelSize}
      resizeButtonClassName={resizeButtonClassName}
      data-test-subj={dataTestSubj}
      onFixedPanelSizeChange={onFixedPanelSizeChange}
      {...panelsProps}
    />
  );
};
