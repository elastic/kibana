/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { useDispatch } from '../store/redux';
import { useExpandableFlyoutContext } from '../context';
import { changePushVsOverlayAction } from '../store/push_vs_overlay_actions';
import { changeCollapsedWidthAction, changeExpandedWidthAction } from '../store/widths_actions';
import { changeInternalPercentagesAction } from '../store/internal_percentages_actions';

const expandableFlyoutLocalStorage = 'expandableFlyout';
const collapsedLocalStorage = 'collapsedResizedWidth';
const expandedLocalStorage = 'expandedResizedWidth';
const internalPercentagesLocalStorage = 'internalPercentage';
const pushVsOverlayModeLocalStorage = 'pushVsOverlayMode';

/**
 *
 */
export const useInitializeFromLocalStorage = () => {
  console.log('useInitializeFromLocalStorage');
  const dispatch = useDispatch();
  const { urlKey } = useExpandableFlyoutContext();

  const pushVsOverlay = localStorage.getItem(
    `${expandableFlyoutLocalStorage}.${pushVsOverlayModeLocalStorage}.${urlKey}`
  );
  if (pushVsOverlay && urlKey) {
    dispatch(
      changePushVsOverlayAction({ type: pushVsOverlay, id: urlKey, savedToLocalStorage: false })
    );
  }

  const collapsedWidth = localStorage.getItem(
    `${expandableFlyoutLocalStorage}.${collapsedLocalStorage}.${urlKey}`
  );
  if (collapsedWidth && urlKey) {
    dispatch(
      changeCollapsedWidthAction({
        width: parseInt(collapsedWidth, 10),
        id: urlKey,
        savedToLocalStorage: false,
      })
    );
  }

  const expandedWidth = localStorage.getItem(
    `${expandableFlyoutLocalStorage}.${expandedLocalStorage}.${urlKey}`
  );
  if (expandedWidth && urlKey) {
    dispatch(
      changeExpandedWidthAction({
        width: parseInt(expandedWidth, 10),
        id: urlKey,
        savedToLocalStorage: false,
      })
    );
  }

  const internalPercentages = localStorage.getItem(
    `${expandableFlyoutLocalStorage}.${internalPercentagesLocalStorage}.${urlKey}`
  );
  if (internalPercentages && urlKey) {
    const value = JSON.parse(internalPercentages);
    dispatch(
      changeInternalPercentagesAction({
        right: value.right,
        left: value.left,
        id: urlKey,
        savedToLocalStorage: false,
      })
    );
  }
};
