/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import {
  USER_COLLAPSED_WIDTH_LOCAL_STORAGE,
  EXPANDABLE_FLYOUT_LOCAL_STORAGE,
  USER_EXPANDED_WIDTH_LOCAL_STORAGE,
  USER_SECTION_WIDTHS_LOCAL_STORAGE,
  PUSH_VS_OVERLAY_LOCAL_STORAGE,
} from '../constants';
import { useDispatch } from '../store/redux';
import {
  changeUserCollapsedWidthAction,
  changeUserExpandedWidthAction,
  changeUserSectionWidthsAction,
  changePushVsOverlayAction,
} from '../store/actions';

/**
 * Hook to initialize all the values in redux state from local storage
 * - push vs overlay
 * - user's custom collapsed width
 * - user's custom expanded width
 * - user's custom section percentages
 */
export const useInitializeFromLocalStorage = () => {
  const dispatch = useDispatch();

  const expandableFlyout = localStorage.getItem(EXPANDABLE_FLYOUT_LOCAL_STORAGE);
  if (!expandableFlyout) return;

  const pushVsOverlay = JSON.parse(expandableFlyout)[PUSH_VS_OVERLAY_LOCAL_STORAGE];
  if (pushVsOverlay) {
    dispatch(
      changePushVsOverlayAction({
        type: pushVsOverlay as 'push' | 'overlay',
        savedToLocalStorage: false,
      })
    );
  }

  const userCollapsedFlyoutWidth = JSON.parse(expandableFlyout)[USER_COLLAPSED_WIDTH_LOCAL_STORAGE];
  if (userCollapsedFlyoutWidth) {
    dispatch(
      changeUserCollapsedWidthAction({
        width: parseInt(userCollapsedFlyoutWidth, 10),
        savedToLocalStorage: false,
      })
    );
  }

  const userExpandedFlyoutWidth = JSON.parse(expandableFlyout)[USER_EXPANDED_WIDTH_LOCAL_STORAGE];
  if (userExpandedFlyoutWidth) {
    dispatch(
      changeUserExpandedWidthAction({
        width: parseInt(userExpandedFlyoutWidth, 10),
        savedToLocalStorage: false,
      })
    );
  }

  const userSectionWidths = JSON.parse(expandableFlyout)[USER_SECTION_WIDTHS_LOCAL_STORAGE];
  if (userSectionWidths) {
    dispatch(
      changeUserSectionWidthsAction({
        right: userSectionWidths.right,
        left: userSectionWidths.left,
        savedToLocalStorage: false,
      })
    );
  }
};
