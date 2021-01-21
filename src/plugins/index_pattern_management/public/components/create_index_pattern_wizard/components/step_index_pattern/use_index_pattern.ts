/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import React, { useCallback, useEffect, useReducer } from 'react';
import { EuiSwitchEvent } from '@elastic/eui';
import { getIndices, canAppendWildcard, ensureMinimumTime } from '../../lib';
import { MatchedItem } from '../../types';
import { useKibana } from '../../../../../../kibana_react/public';
import { IndexPatternAttributes } from '../../../../../../data/common/index_patterns';
import { IndexPatternCreationConfig } from '../../../../service/creation';
import { combineIndices } from './utils';

interface StepIndexPatternState {
  appendedWildcard: boolean;
  exactMatchedIndices: MatchedItem[];
  existingIndexPatterns: string[];
  indexPatternName: string;
  isIncludingSystemIndices: boolean;
  isLoadingIndices: boolean;
  partialMatchedIndices: MatchedItem[];
  patternError: boolean;
  selectedPatterns: string[];
  title: string;
  titleError: boolean;
}

type Action =
  | { type: 'FETCH_INIT' }
  | {
      type: 'SET_TITLE';
      payload: {
        title: string;
        titleError: boolean;
      };
    }
  | { type: 'SET_EXISTING_TITLES'; payload: string[] }
  | { type: 'SET_INCLUDING_SYSTEM_INDICES'; payload: boolean }
  | {
      type: 'SET_SELECTED_PATTERNS';
      payload: { selectedPatterns: string[]; patternError: boolean };
    }
  | { type: 'SET_INDEX_PATTERN_NAME'; payload: string }
  | {
      type: 'FETCH_SUCCESS';
      payload: { exactMatchedIndices: MatchedItem[]; partialMatchedIndices: MatchedItem[] };
    }
  | { type: 'FETCH_FAILURE' };

const dataFetchReducer = (state: StepIndexPatternState, action: Action): StepIndexPatternState => {
  switch (action.type) {
    case 'SET_TITLE':
      return {
        ...state,
        ...action.payload,
      };
    case 'SET_EXISTING_TITLES':
      return {
        ...state,
        existingIndexPatterns: action.payload,
      };
    case 'SET_SELECTED_PATTERNS':
      return {
        ...state,
        ...action.payload,
      };
    case 'SET_INDEX_PATTERN_NAME':
      return {
        ...state,
        indexPatternName: action.payload,
      };
    case 'SET_INCLUDING_SYSTEM_INDICES':
      return {
        ...state,
        isIncludingSystemIndices: action.payload,
      };
    case 'FETCH_INIT':
      return {
        ...state,
        isLoadingIndices: true,
      };
    case 'FETCH_SUCCESS':
      return {
        ...state,
        ...action.payload,
        isLoadingIndices: false,
      };
    case 'FETCH_FAILURE':
      return {
        ...state,
        isLoadingIndices: false,
      };
    default:
      return state;
  }
};

export interface UseIndexPattern {
  onChangeIncludingSystemIndices: (event: EuiSwitchEvent) => void;
  onQueryChanged: (patterns: string[]) => void;
  onTitleChanged: (e: React.ChangeEvent<HTMLInputElement>) => void;
  setExistingTitles: (existingTitles: string[]) => void;
  setIndexPatternName: (title: string) => void;
  state: StepIndexPatternState;
}

const initialState = {
  appendedWildcard: false,
  exactMatchedIndices: [],
  existingIndexPatterns: [],
  indexPatternName: '',
  isIncludingSystemIndices: false,
  isLoadingIndices: false,
  partialMatchedIndices: [],
  patternError: false,
  selectedPatterns: [],
  title: '',
  titleError: false,
};

export const useIndexPattern = (
  indexPatternCreationType: IndexPatternCreationConfig
): UseIndexPattern => {
  const { http, savedObjects } = useKibana().services;
  const [state, dispatch] = useReducer(dataFetchReducer, initialState);

  const setExistingTitles = useCallback(
    (existingTitles) => dispatch({ type: 'SET_EXISTING_TITLES', payload: existingTitles }),
    []
  );
  const setIndexPatternName = useCallback(
    (title) => dispatch({ type: 'SET_INDEX_PATTERN_NAME', payload: title }),
    []
  );
  const fetchExistingIndexPatterns = useCallback(async () => {
    if (savedObjects) {
      const { savedObjects: patterns } = await savedObjects.client.find<IndexPatternAttributes>({
        type: 'index-pattern',
        fields: ['title'],
        perPage: 10000,
      });

      const existingTitles: string[] = patterns.map((obj) =>
        obj && obj.attributes ? obj.attributes.title : ''
      );
      dispatch({ type: 'SET_EXISTING_TITLES', payload: existingTitles });
    }
  }, [savedObjects]);
  const fetchIndices = useCallback(
    async (wildcardArray: string[]) => {
      if (http == null) {
        return dispatch({ type: 'FETCH_FAILURE' });
      }
      let cancel = false;

      try {
        dispatch({ type: 'FETCH_INIT' });
        let exactMatchedIndices: MatchedItem[] = [];
        let partialMatchedIndices: MatchedItem[] = [];
        await Promise.all(
          wildcardArray.map(async (query) => {
            if (query.endsWith('*')) {
              const exactMatchedIndices2 = await ensureMinimumTime(
                getIndices(
                  http,
                  (indexName: string) => indexPatternCreationType.getIndexTags(indexName),
                  query,
                  state.isIncludingSystemIndices
                )
              );
              exactMatchedIndices = combineIndices(exactMatchedIndices, exactMatchedIndices2);
            } else {
              const [partialMatchedIndices2, exactMatchedIndices2] = await ensureMinimumTime([
                getIndices(
                  http,
                  (indexName: string) => indexPatternCreationType.getIndexTags(indexName),
                  `${query}*`,
                  state.isIncludingSystemIndices
                ),
                getIndices(
                  http,
                  (indexName: string) => indexPatternCreationType.getIndexTags(indexName),
                  query,
                  state.isIncludingSystemIndices
                ),
              ]);
              exactMatchedIndices = combineIndices(exactMatchedIndices, exactMatchedIndices2);
              partialMatchedIndices = combineIndices(partialMatchedIndices, partialMatchedIndices2);
            }
          })
        );

        if (!cancel) {
          dispatch({
            type: 'FETCH_SUCCESS',
            payload: { exactMatchedIndices, partialMatchedIndices },
          });
          return { exactMatchedIndices, partialMatchedIndices };
        }
      } catch (error) {
        if (!cancel) {
          dispatch({ type: 'FETCH_FAILURE' });
        }
      }
      return () => {
        cancel = true;
      };
    },
    [http, indexPatternCreationType, state.isIncludingSystemIndices]
  );

  const onTitleChanged = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      if ((state.existingIndexPatterns as string[]).includes(e.target.value)) {
        return dispatch({
          type: 'SET_TITLE',
          payload: {
            title: e.target.value,
            titleError: true,
          },
        });
      }
      return dispatch({
        type: 'SET_TITLE',
        payload: {
          title: e.target.value,
          titleError: false,
        },
      });
    },
    [state.existingIndexPatterns]
  );
  const onQueryChanged = useCallback((patterns: string[]) => {
    const wildcardArray = patterns.map((pat) => {
      let q = pat;
      if (q.length === 1 && canAppendWildcard(q)) {
        q += '*';
      }
      return q;
    });
    dispatch({
      type: 'SET_SELECTED_PATTERNS',
      payload: {
        selectedPatterns: wildcardArray,
        patternError: !wildcardArray.length,
      },
    });
  }, []);

  const onChangeIncludingSystemIndices = useCallback((event: EuiSwitchEvent) => {
    dispatch({
      type: 'SET_INCLUDING_SYSTEM_INDICES',
      payload: event.target.checked,
    });
  }, []);

  useEffect(() => {
    if (state.selectedPatterns.length > 0 && !state.patternError) {
      fetchIndices(state.selectedPatterns);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.patternError, state.selectedPatterns, state.isIncludingSystemIndices]);

  useEffect(() => {
    fetchExistingIndexPatterns();
    if (state.selectedPatterns.length > 0) {
      fetchIndices(state.selectedPatterns);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return {
    onChangeIncludingSystemIndices,
    onQueryChanged,
    onTitleChanged,
    setExistingTitles,
    setIndexPatternName,
    state,
  };
};
