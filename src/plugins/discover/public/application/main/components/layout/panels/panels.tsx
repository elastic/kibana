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

export enum PANELS_MODE {
  SINGLE = 'single',
  FIXED = 'fixed',
  RESIZABLE = 'resizable',
}

export enum PANELS_DIRECTION {
  HORIZONTAL = 'horizontal',
  VERTICAL = 'vertical',
}

export interface PanelsProps {
  className?: string;
  mode: PANELS_MODE;
  direction: PANELS_DIRECTION;
  resizeRef: RefObject<HTMLDivElement>;
  fixedPanelSize: number;
  minFixedPanelSize: number;
  minFlexPanelSize: number;
  fixedPanel: ReactElement;
  flexPanel: ReactElement;
  onFixedPanelSizeChange?: (fixedPanelSize: number) => void;
}

const fixedModes = [PANELS_MODE.SINGLE, PANELS_MODE.FIXED];

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
  onFixedPanelSizeChange,
}: PanelsProps) => {
  const panelsProps = { className, fixedPanel, flexPanel };

  return fixedModes.includes(mode) ? (
    <PanelsFixed
      direction={direction}
      hideFixedPanel={mode === PANELS_MODE.SINGLE}
      {...panelsProps}
    />
  ) : (
    <PanelsResizable
      direction={direction}
      resizeRef={resizeRef}
      fixedPanelSize={fixedPanelSize}
      minFixedPanelSize={minFixedPanelSize}
      minFlexPanelSize={minFlexPanelSize}
      onFixedPanelSizeChange={onFixedPanelSizeChange}
      {...panelsProps}
    />
  );
};
