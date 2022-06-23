/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { PayloadAction } from '@reduxjs/toolkit';
import { WritableDraft } from 'immer/dist/types/types-external';

import { RangeSliderEmbeddableInput, RangeValue } from './types';

export const rangeSliderReducers = {
  selectRange: (
    state: WritableDraft<RangeSliderEmbeddableInput>,
    action: PayloadAction<RangeValue>
  ) => {
    state.value = action.payload;
  },
};
