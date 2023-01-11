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

export interface PanelsProps {
  className?: string;
  mode: PANELS_MODE;
  resizeRef: RefObject<HTMLDivElement>;
  topPanelHeight: number;
  minTopPanelHeight: number;
  minMainPanelHeight: number;
  topPanel: ReactElement;
  mainPanel: ReactElement;
  onTopPanelHeightChange?: (topPanelHeight: number) => void;
}

const fixedModes = [PANELS_MODE.SINGLE, PANELS_MODE.FIXED];

export const Panels = ({
  className,
  mode,
  resizeRef,
  topPanelHeight,
  minTopPanelHeight,
  minMainPanelHeight,
  topPanel,
  mainPanel,
  onTopPanelHeightChange,
}: PanelsProps) => {
  const panelsProps = { className, topPanel, mainPanel };

  return fixedModes.includes(mode) ? (
    <PanelsFixed hideTopPanel={mode === PANELS_MODE.SINGLE} {...panelsProps} />
  ) : (
    <PanelsResizable
      resizeRef={resizeRef}
      topPanelHeight={topPanelHeight}
      minTopPanelHeight={minTopPanelHeight}
      minMainPanelHeight={minMainPanelHeight}
      onTopPanelHeightChange={onTopPanelHeightChange}
      {...panelsProps}
    />
  );
};
