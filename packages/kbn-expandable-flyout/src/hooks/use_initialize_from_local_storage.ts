/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import {
  COLLAPSED_WIDTH_LOCAL_STORAGE,
  EXPANDABLE_FLYOUT_LOCAL_STORAGE,
  EXPANDED_WIDTH_LOCAL_STORAGE,
  INTERNAL_PERCENTAGES_LOCAL_STORAGE,
  PUSH_VS_OVERLAY_LOCAL_STORAGE,
} from '../constants';
import { useDispatch } from '../store/redux';
import { useExpandableFlyoutContext } from '../context';
import {
  changePushVsOverlayAction,
  changeCollapsedWidthAction,
  changeExpandedWidthAction,
  changeInternalPercentagesAction,
} from '../store/actions';

/**
 *
 */
export const useInitializeFromLocalStorage = () => {
  console.log('render - useInitializeFromLocalStorage');
  const dispatch = useDispatch();
  const { urlKey } = useExpandableFlyoutContext();

  const pushVsOverlay = localStorage.getItem(
    `${EXPANDABLE_FLYOUT_LOCAL_STORAGE}.${PUSH_VS_OVERLAY_LOCAL_STORAGE}.${urlKey}`
  );
  if (pushVsOverlay && urlKey) {
    dispatch(
      changePushVsOverlayAction({ type: pushVsOverlay, id: urlKey, savedToLocalStorage: false })
    );
  }

  const collapsedWidth = localStorage.getItem(
    `${EXPANDABLE_FLYOUT_LOCAL_STORAGE}.${COLLAPSED_WIDTH_LOCAL_STORAGE}.${urlKey}`
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
    `${EXPANDABLE_FLYOUT_LOCAL_STORAGE}.${EXPANDED_WIDTH_LOCAL_STORAGE}.${urlKey}`
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
    `${EXPANDABLE_FLYOUT_LOCAL_STORAGE}.${INTERNAL_PERCENTAGES_LOCAL_STORAGE}.${urlKey}`
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
