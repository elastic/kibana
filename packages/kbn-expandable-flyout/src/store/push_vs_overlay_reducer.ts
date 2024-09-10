/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { createReducer } from '@reduxjs/toolkit';
import { changePushVsOverlayAction } from './push_vs_overlay_actions';
import { initialState } from './push_vs_overlay_state';

export const pushVsOverlayReducer = createReducer(initialState, (builder) => {
  builder.addCase(changePushVsOverlayAction, (state, { payload: { type, id } }) => {
    state.pushVsOverlayById[id] = type;
  });
});
