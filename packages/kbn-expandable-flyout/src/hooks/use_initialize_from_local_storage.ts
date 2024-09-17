/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { EXPANDABLE_FLYOUT_LOCAL_STORAGE, PUSH_VS_OVERLAY_LOCAL_STORAGE } from '../constants';
import { useDispatch } from '../store/redux';
import { changePushVsOverlayAction } from '../store/actions';

/**
 * Hook to initialize the push vs overlay redux state from local storage
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
};
