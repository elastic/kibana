/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { ReactElement, RefObject } from 'react';
import React from 'react';
import { PanelsResizable } from './panels_resizable';
import { PanelsFixed } from './panels_fixed';
import { ResizableLayoutDirection, ResizableLayoutMode } from '../types';

export interface PanelsProps {
  className?: string;
  mode: ResizableLayoutMode;
  direction: ResizableLayoutDirection;
  resizeRef: RefObject<HTMLDivElement>;
  fixedPanelSize: number;
  minFixedPanelSize: number;
  minFlexPanelSize: number;
  fixedPanel: ReactElement;
  flexPanel: ReactElement;
  resizeButtonClassName?: string;
  onFixedPanelSizeChange?: (fixedPanelSize: number) => void;
}

const fixedModes = [ResizableLayoutMode.Single, ResizableLayoutMode.Fixed];

export const Panels = ({
  className,
  mode,
  direction,
  resizeRef,
  fixedPanelSize,
  minFixedPanelSize,
  minFlexPanelSize,
  fixedPanel,
  flexPanel,
  resizeButtonClassName,
  onFixedPanelSizeChange,
}: PanelsProps) => {
  const panelsProps = { className, fixedPanel, flexPanel };

  return fixedModes.includes(mode) ? (
    <PanelsFixed
      direction={direction}
      hideFixedPanel={mode === ResizableLayoutMode.Single}
      {...panelsProps}
    />
  ) : (
    <PanelsResizable
      direction={direction}
      resizeRef={resizeRef}
      fixedPanelSize={fixedPanelSize}
      minFixedPanelSize={minFixedPanelSize}
      minFlexPanelSize={minFlexPanelSize}
      resizeButtonClassName={resizeButtonClassName}
      onFixedPanelSizeChange={onFixedPanelSizeChange}
      {...panelsProps}
    />
  );
};
