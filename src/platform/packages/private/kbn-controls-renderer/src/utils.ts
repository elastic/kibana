/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import {
  CONTROL_WIDTH_LARGE,
  CONTROL_WIDTH_MEDIUM,
  CONTROL_WIDTH_SMALL,
} from '@kbn/controls-constants';
import type { FlexLayoutData } from '@kbn/grid-layout';

import type { ControlsLayout, PublishesFocusedPanelId, PublishesLabel } from './types';
import { ControlWidth } from '@kbn/controls-schemas';

export const apiPublishesFocusedPanelId = (api: unknown): api is PublishesFocusedPanelId =>
  Boolean((api as PublishesFocusedPanelId).focusedPanelId$);

export const apiPublishesLabel = (api: unknown): api is PublishesLabel =>
  Boolean((api as PublishesLabel).label$);

/** the pixel width the flex layout renders for each control width option */
export const CONTROL_WIDTH_PIXELS: Readonly<Record<ControlWidth, number>> = {
  [CONTROL_WIDTH_SMALL]: 224,
  [CONTROL_WIDTH_MEDIUM]: 400,
  [CONTROL_WIDTH_LARGE]: 800,
};

/** snaps an arbitrary pixel width (e.g. from a resize) to the closest control width option */
export const getClosestControlWidth = (pixels: number): ControlWidth => {
  const widths = Object.keys(CONTROL_WIDTH_PIXELS) as ControlWidth[];
  return widths.reduce((closest, width) =>
    Math.abs(CONTROL_WIDTH_PIXELS[width] - pixels) <
    Math.abs(CONTROL_WIDTH_PIXELS[closest] - pixels)
      ? width
      : closest
  );
};

export const controlsLayoutToFlexLayout = ({ controls }: ControlsLayout): FlexLayoutData =>
  Object.entries(controls).reduce<FlexLayoutData>((flexLayout, [id, { order, width, grow }]) => {
    console.log('controlsLayoutToFlexLayout', { width });
    flexLayout[id] = {
      type: 'panel',
      id,
      order,
      grow: Boolean(grow),
      width: CONTROL_WIDTH_PIXELS[width ?? CONTROL_WIDTH_MEDIUM],
    };
    return flexLayout;
  }, {});

/** Applies the order, width and grow of a flex layout onto the existing controls layout */
export const flexLayoutToControlsLayout = (
  flexLayout: FlexLayoutData,
  { controls }: ControlsLayout
): ControlsLayout => ({
  controls: Object.entries(flexLayout).reduce<ControlsLayout['controls']>(
    (nextControls, [id, { order, width, grow }]) => {
      console.log('flexLayoutToControlsLayout', { width, closest: getClosestControlWidth(width) });
      if (!controls[id]) return nextControls;
      nextControls[id] = { ...controls[id], order, grow, width: getClosestControlWidth(width) };
      return nextControls;
    },
    {}
  ),
});
