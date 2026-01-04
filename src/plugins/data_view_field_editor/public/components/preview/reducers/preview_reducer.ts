/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { Context } from '../types';

export interface PreviewState {
  previewResponse: { fields: Context['fields']; error: Context['error'] };
  isLoadingPreviewInFlight: boolean;
  initialPreviewComplete: boolean;
}

export type PreviewAction =
  | { type: 'SET_LOADING_IN_FLIGHT'; isLoadingPreviewInFlight: boolean }
  | { type: 'SET_PREVIEW_RESPONSE'; previewResponse: PreviewState['previewResponse'] }
  | { type: 'SET_INITIAL_PREVIEW_COMPLETE'; initialPreviewComplete: boolean }
  | { type: 'RESET_PREVIEW_RESPONSE' };

export const initialPreviewState: PreviewState = {
  previewResponse: { fields: [], error: null },
  isLoadingPreviewInFlight: false,
  initialPreviewComplete: false,
};

export const previewReducer = (state: PreviewState, action: PreviewAction): PreviewState => {
  switch (action.type) {
    case 'SET_LOADING_IN_FLIGHT':
      return { ...state, isLoadingPreviewInFlight: action.isLoadingPreviewInFlight };
    case 'SET_PREVIEW_RESPONSE':
      return { ...state, previewResponse: action.previewResponse };
    case 'SET_INITIAL_PREVIEW_COMPLETE':
      return { ...state, initialPreviewComplete: action.initialPreviewComplete };
    case 'RESET_PREVIEW_RESPONSE':
      return {
        ...state,
        previewResponse: { fields: [], error: null },
        isLoadingPreviewInFlight: false,
      };
    default:
      return state;
  }
};
