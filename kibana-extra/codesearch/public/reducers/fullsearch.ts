/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import produce from 'immer';
import { Action, handleActions } from 'redux-actions';

import { RepositoryUtils } from '../../common/repository_utils';
import { FullSearchResult } from '../../model';
import { fullSearch, fullSearchFailed, fullSearchSuccess } from '../actions';

export interface FullSearchState {
  query: string;
  isLoading: boolean;
  error?: Error;
  searchResult?: FullSearchResult;
}

const initialState: FullSearchState = {
  query: 'queryBuilder',
  isLoading: false,
};

export const fullsearch = handleActions(
  {
    [String(fullSearch)]: (state: FullSearchState, action: Action<any>) =>
      produce<FullSearchState>(state, draft => {
        draft.query = action.payload;
        draft.isLoading = true;
        draft.error = undefined;
      }),
    [String(fullSearchSuccess)]: (state: FullSearchState, action: Action<any>) =>
      produce<FullSearchState>(state, draft => {
        const { documents, highlights, total, repoAggregations, langAggregations } = action.payload;
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
          const { repoUri, path, content } = document;
          const highlight = highlights[index];
          return {
            uri: repoUri,
            hits: highlight.length,
            filePath: path,
            content,
            highlight,
          };
        });
        draft.searchResult = {
          ...draft.searchResult,
          query: state.query,
          stats: {
            total,
            from: 1,
            to: documents.length,
            page: 1,
            repoStats,
            languageStats,
          },
          result,
        };
      }),
    [String(fullSearchFailed)]: (state: FullSearchState, action: Action<any>) => {
      if (action.payload) {
        return produce<FullSearchState>(state, draft => {
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
