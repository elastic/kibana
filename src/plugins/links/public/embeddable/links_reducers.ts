/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { WritableDraft } from 'immer/dist/types/types-external';

import { PayloadAction } from '@reduxjs/toolkit';

import { LinksReduxState } from './types';
import { LinksAttributes } from '../../common/content_management';

export const linksReducers = {
  setLoading: (state: WritableDraft<LinksReduxState>, action: PayloadAction<boolean>) => {
    state.output.loading = action.payload;
  },

  setAttributes: (
    state: WritableDraft<LinksReduxState>,
    action: PayloadAction<LinksAttributes>
  ) => {
    state.componentState = { ...action.payload };
  },
};
