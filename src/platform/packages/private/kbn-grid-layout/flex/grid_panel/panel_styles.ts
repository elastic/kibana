/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ActivePanelEvent, FlexPanelData } from './types';

/**
 * These helpers update a panel's styles imperatively while it is dragged or resized, so
 * that interactions don't cause React re-renders.
 */

/** Pins a panel at its rendered width so no panel can grow/shrink and shift the one being resized */
export const pinPanelWidth = (ref: HTMLDivElement, width: number) => {
  ref.style.width = `${width}px`;
  ref.style.flexGrow = '0';
  ref.style.flexShrink = '0';
};

/** Styles the panel that is currently being dragged or resized */
export const applyActivePanelStyles = ({
  ref,
  activePanel,
  panel,
  zIndex,
}: {
  ref: HTMLDivElement;
  activePanel: ActivePanelEvent;
  panel: FlexPanelData;
  zIndex: string | number;
}) => {
  const { position, type, sensorType } = activePanel;
  const width = `${position.right - position.left}px`;

  ref.classList.add('kbnFlexPanel--active');
  ref.style.zIndex = `${zIndex}`;

  if (type === 'resize') {
    // ensure the panel is not shrunk past the size of a single cell
    ref.style.flexShrink = '0';
    ref.style.flexGrow = '0';
    ref.style.width = width;
  } else if (sensorType === 'keyboard') {
    // keyboard "drags" move the panel by changing its order, so it stays in the flow
    ref.style.order = `${panel.order + 1}`;
  } else {
    // mouse + touch drags render the panel with a fixed position + size
    ref.style.position = 'fixed';
    ref.style.left = `${position.left}px`;
    ref.style.top = `${position.top}px`;
    ref.style.width = width;
    ref.style.height = `${position.bottom - position.top}px`;
  }
};

/** Undoes any interaction styles so the panel is positioned by the layout again */
export const clearActivePanelStyles = (ref: HTMLDivElement, panel: FlexPanelData) => {
  ref.classList.remove('kbnFlexPanel--active');
  ref.style.zIndex = 'auto';
  ref.style.position = '';
  ref.style.left = '';
  ref.style.top = '';
  ref.style.width = `${panel.width}px`;
  ref.style.height = '';
  ref.style.order = `${panel.order + 1}`;
  ref.style.flexShrink = '';
  ref.style.flexGrow = panel.grow ? '1' : '0';
};
