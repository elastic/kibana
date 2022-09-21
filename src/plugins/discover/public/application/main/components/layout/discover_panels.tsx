/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { ReactElement, RefObject } from 'react';
import { DiscoverPanelsResizable } from './discover_panels_resizable';
import { DiscoverPanelsFixed } from './discover_panels_fixed';

export enum DISCOVER_PANELS_MODE {
  SINGLE = 'single',
  FIXED = 'fixed',
  RESIZABLE = 'resizable',
}

export interface DiscoverPanelsProps {
  className?: string;
  mode: DISCOVER_PANELS_MODE;
  resizeRef: RefObject<HTMLDivElement>;
  topPanelHeight: number;
  minTopPanelHeight: number;
  minMainPanelHeight: number;
  topPanel: ReactElement;
  mainPanel: ReactElement;
  onTopPanelHeightChange: (height: number) => void;
}

const fixedModes = [DISCOVER_PANELS_MODE.SINGLE, DISCOVER_PANELS_MODE.FIXED];

export const DiscoverPanels = ({
  className,
  mode,
  resizeRef,
  topPanelHeight,
  minTopPanelHeight,
  minMainPanelHeight,
  topPanel,
  mainPanel,
  onTopPanelHeightChange,
}: DiscoverPanelsProps) => {
  const panelsProps = { className, topPanel, mainPanel };

  return fixedModes.includes(mode) ? (
    <DiscoverPanelsFixed hideTopPanel={mode === DISCOVER_PANELS_MODE.SINGLE} {...panelsProps} />
  ) : (
    <DiscoverPanelsResizable
      resizeRef={resizeRef}
      topPanelHeight={topPanelHeight}
      minTopPanelHeight={minTopPanelHeight}
      minMainPanelHeight={minMainPanelHeight}
      onTopPanelHeightChange={onTopPanelHeightChange}
      {...panelsProps}
    />
  );
};
