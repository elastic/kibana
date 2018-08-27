/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import produce from 'immer';
import { Action, handleActions } from 'redux-actions';

import { RepositoryUtils } from '../../common/repository_utils';
import { DocumentSearchResult } from '../../model';
import {
  documentSearch as documentSearchQuery,
  documentSearchFailed,
  DocumentSearchPayload,
  documentSearchSuccess,
} from '../actions';

export interface DocumentSearchState {
  query: string;
  page?: number;
  isLoading: boolean;
  error?: Error;
  searchResult?: DocumentSearchResult;
}

const initialState: DocumentSearchState = {
  query: 'queryBuilder',
  isLoading: false,
};

export const documentSearch = handleActions(
  {
    [String(documentSearchQuery)]: (
      state: DocumentSearchState,
      action: Action<DocumentSearchPayload>
    ) =>
      produce<DocumentSearchState>(state, draft => {
        draft.query = action.payload!.query;
        draft.page = action.payload!.page;
        draft.isLoading = true;
        draft.error = undefined;
      }),
    [String(documentSearchSuccess)]: (state: DocumentSearchState, action: Action<any>) =>
      produce<DocumentSearchState>(state, draft => {
        const {
          from,
          page,
          totalPage,
          documents,
          highlights,
          total,
          repoAggregations,
          langAggregations,
        } = action.payload;
        draft.isLoading = false;

        const repoStats = repoAggregations.map(agg => {
          return {
            name: RepositoryUtils.repoNameFromUri(agg.key),
            value: agg.doc_count,
          };
        });

        const languageStats = langAggregations.map(agg => {
          return {
            name: agg.key,
            value: agg.doc_count,
          };
        });

        const result = Array.from(documents).map((document, index) => {
          const { repoUri, path, content, language } = document;
          const fileHighlights = highlights[index];
          return {
            uri: repoUri,
            hits: fileHighlights.length,
            filePath: path,
            content,
            highlights: fileHighlights,
            language,
          };
        });
        draft.searchResult = {
          ...draft.searchResult,
          query: state.query,
          stats: {
            total,
            from: from + 1,
            to: from + documents.length,
            page,
            totalPage,
            repoStats,
            languageStats,
          },
          result,
        };
      }),
    [String(documentSearchFailed)]: (state: DocumentSearchState, action: Action<any>) => {
      if (action.payload) {
        return produce<DocumentSearchState>(state, draft => {
          draft.isLoading = false;
          draft.error = action.payload.error;
        });
      } else {
        return state;
      }
    },
  },
  initialState
);
