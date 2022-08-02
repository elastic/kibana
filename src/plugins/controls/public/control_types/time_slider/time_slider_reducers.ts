/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { PayloadAction } from '@reduxjs/toolkit';
import { WritableDraft } from 'immer/dist/types/types-external';
import { TimeSliderReduxState } from './types';

export const timeSliderReducers = {
  selectRange: (
    state: WritableDraft<TimeSliderReduxState>,
    action: PayloadAction<[number | null, number | null]>
  ) => {
    state.explicitInput.value = action.payload;
  },
};
