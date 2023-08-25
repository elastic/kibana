/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { WritableDraft } from 'immer/dist/types/types-external';

import { PayloadAction } from '@reduxjs/toolkit';

import { NavigationEmbeddableReduxState } from './types';
import { NavigationEmbeddableAttributes } from '../../common/content_management';

export const navigationEmbeddableReducers = {
  /**
   * TODO: Right now, we aren't using any reducers - but, I'm keeping this here as a draft
   * just in case we need them later on. As a final cleanup, we could remove this if we never
   * end up using reducers
   */
  setLoading: (
    state: WritableDraft<NavigationEmbeddableReduxState>,
    action: PayloadAction<boolean>
  ) => {
    state.output.loading = action.payload;
  },

  setAttributes: (
    state: WritableDraft<NavigationEmbeddableReduxState>,
    action: PayloadAction<NavigationEmbeddableAttributes>
  ) => {
    state.componentState = { ...action.payload };
  },
};
