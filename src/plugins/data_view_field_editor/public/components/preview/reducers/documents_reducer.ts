/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { ClusterData, EsDocument, FetchDocError } from '../types';

export interface DocumentsState {
  clusterData: ClusterData;
  fetchDocError: FetchDocError | null;
  isFetchingDocumentInFlight: boolean;
}

export type DocumentsAction =
  | { type: 'FETCH_SAMPLE_START' }
  | { type: 'FETCH_SAMPLE_FINISH'; error: FetchDocError | null; documents?: EsDocument[] }
  | { type: 'LOAD_DOC_START' }
  | { type: 'LOAD_DOC_FINISH'; error: FetchDocError | null; documents?: EsDocument[] }
  | { type: 'NAV_NEXT' }
  | { type: 'NAV_PREV' }
  | { type: 'RESET_DOCUMENTS' };

export const initialDocumentsState: DocumentsState = {
  clusterData: { documents: [], currentIdx: 0 },
  fetchDocError: null,
  isFetchingDocumentInFlight: false,
};

export const documentsReducer = (
  state: DocumentsState,
  action: DocumentsAction
): DocumentsState => {
  switch (action.type) {
    case 'FETCH_SAMPLE_START':
      return { ...state, isFetchingDocumentInFlight: true };
    case 'FETCH_SAMPLE_FINISH': {
      const next: DocumentsState = {
        ...state,
        isFetchingDocumentInFlight: false,
        fetchDocError: action.error,
      };
      if (action.error === null && action.documents) {
        next.clusterData = { documents: action.documents, currentIdx: 0 };
      }
      return next;
    }
    case 'LOAD_DOC_START':
      return { ...state, isFetchingDocumentInFlight: true };
    case 'LOAD_DOC_FINISH': {
      const next: DocumentsState = {
        ...state,
        isFetchingDocumentInFlight: false,
        fetchDocError: action.error,
      };
      if (action.error === null && action.documents) {
        next.clusterData = { documents: action.documents, currentIdx: 0 };
      }
      return next;
    }
    case 'NAV_NEXT': {
      const totalDocs = state.clusterData.documents.length;
      if (totalDocs === 0) {
        return state;
      }
      const currentIdx =
        state.clusterData.currentIdx >= totalDocs - 1 ? 0 : state.clusterData.currentIdx + 1;
      return { ...state, clusterData: { ...state.clusterData, currentIdx } };
    }
    case 'NAV_PREV': {
      const totalDocs = state.clusterData.documents.length;
      if (totalDocs === 0) {
        return state;
      }
      const currentIdx =
        state.clusterData.currentIdx === 0 ? totalDocs - 1 : state.clusterData.currentIdx - 1;
      return { ...state, clusterData: { ...state.clusterData, currentIdx } };
    }
    case 'RESET_DOCUMENTS':
      return {
        ...state,
        clusterData: { documents: [], currentIdx: 0 },
        isFetchingDocumentInFlight: false,
      };
    default:
      return state;
  }
};
