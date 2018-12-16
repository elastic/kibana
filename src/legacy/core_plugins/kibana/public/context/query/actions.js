/*
 * Licensed to Elasticsearch B.V. under one or more contributor
 * license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright
 * ownership. Elasticsearch B.V. licenses this file to you under
 * the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

import _ from 'lodash';
import React from 'react';
import { MarkdownSimple } from 'ui/markdown';
import { toastNotifications } from 'ui/notify';

import { fetchAnchorProvider } from '../api/anchor';
import { fetchContextProvider } from '../api/context';
import { QueryParameterActionsProvider } from '../query_parameters';
import { FAILURE_REASONS, LOADING_STATUS } from './constants';

export function QueryActionsProvider(courier, Private, Promise, i18n) {
  const fetchAnchor = Private(fetchAnchorProvider);
  const { fetchPredecessors, fetchSuccessors } = Private(fetchContextProvider);
  const {
    increasePredecessorCount,
    increaseSuccessorCount,
    setPredecessorCount,
    setQueryParameters,
    setSuccessorCount,
  } = Private(QueryParameterActionsProvider);

  const setFailedStatus = (state) => (subject, details = {}) => (
    state.loadingStatus[subject] = {
      status: LOADING_STATUS.FAILED,
      reason: FAILURE_REASONS.UNKNOWN,
      ...details,
    }
  );

  const setLoadedStatus = (state) => (subject) => (
    state.loadingStatus[subject] = {
      status: LOADING_STATUS.LOADED,
    }
  );

  const setLoadingStatus = (state) => (subject) => (
    state.loadingStatus[subject] = {
      status: LOADING_STATUS.LOADING,
    }
  );

  const fetchAnchorRow = (state) => () => {
    const { queryParameters: { indexPatternId, anchorType, anchorId, sort, tieBreakerField } } = state;

    if (!tieBreakerField) {
      return Promise.reject(setFailedStatus(state)('anchor', {
        reason: FAILURE_REASONS.INVALID_TIEBREAKER
      }));
    }

    setLoadingStatus(state)('anchor');

    return Promise.try(() => (
      fetchAnchor(indexPatternId, anchorType, anchorId, [_.zipObject([sort]), { [tieBreakerField]: 'asc' }])
    ))
      .then(
        (anchorDocument) => {
          setLoadedStatus(state)('anchor');
          state.rows.anchor = anchorDocument;
          return anchorDocument;
        },
        (error) => {
          setFailedStatus(state)('anchor', { error });
          toastNotifications.addDanger({
            title: i18n('kbn.context.unableToLoadAnchorDocumentDescription', {
              defaultMessage: 'Unable to load the anchor document'
            }),
            text: <MarkdownSimple>{error.message}</MarkdownSimple>,
          });
          throw error;
        }
      );
  };

  const fetchPredecessorRows = (state) => () => {
    const {
      queryParameters: { indexPatternId, filters, predecessorCount, sort, tieBreakerField },
      rows: { anchor },
    } = state;

    if (!tieBreakerField) {
      return Promise.reject(setFailedStatus(state)('predecessors', {
        reason: FAILURE_REASONS.INVALID_TIEBREAKER
      }));
    }

    setLoadingStatus(state)('predecessors');

    return Promise.try(() => (
      fetchPredecessors(
        indexPatternId,
        sort[0],
        sort[1],
        anchor.sort[0],
        tieBreakerField,
        'asc',
        anchor.sort[1],
        predecessorCount,
        filters
      )
    ))
      .then(
        (predecessorDocuments) => {
          setLoadedStatus(state)('predecessors');
          state.rows.predecessors = predecessorDocuments;
          return predecessorDocuments;
        },
        (error) => {
          setFailedStatus(state)('predecessors', { error });
          toastNotifications.addDanger({
            title: i18n('kbn.context.unableToLoadDocumentDescription', {
              defaultMessage: 'Unable to load documents'
            }),
            text: <MarkdownSimple>{error.message}</MarkdownSimple>,
          });
          throw error;
        },
      );
  };

  const fetchSuccessorRows = (state) => () => {
    const {
      queryParameters: { indexPatternId, filters, sort, successorCount, tieBreakerField },
      rows: { anchor },
    } = state;

    if (!tieBreakerField) {
      return Promise.reject(setFailedStatus(state)('successors', {
        reason: FAILURE_REASONS.INVALID_TIEBREAKER
      }));
    }

    setLoadingStatus(state)('successors');

    return Promise.try(() => (
      fetchSuccessors(
        indexPatternId,
        sort[0],
        sort[1],
        anchor.sort[0],
        tieBreakerField,
        'asc',
        anchor.sort[1],
        successorCount,
        filters
      )
    ))
      .then(
        (successorDocuments) => {
          setLoadedStatus(state)('successors');
          state.rows.successors = successorDocuments;
          return successorDocuments;
        },
        (error) => {
          setFailedStatus(state)('successors', { error });
          toastNotifications.addDanger({
            title: 'Unable to load documents',
            text: <MarkdownSimple>{error.message}</MarkdownSimple>,
          });
          throw error;
        },
      );
  };

  const fetchContextRows = (state) => () => (
    Promise.all([
      fetchPredecessorRows(state)(),
      fetchSuccessorRows(state)(),
    ])
  );

  const fetchAllRows = (state) => () => (
    Promise.try(fetchAnchorRow(state))
      .then(fetchContextRows(state))
  );

  const fetchContextRowsWithNewQueryParameters = (state) => (queryParameters) => {
    setQueryParameters(state)(queryParameters);
    return fetchContextRows(state)();
  };

  const fetchAllRowsWithNewQueryParameters = (state) => (queryParameters) => {
    setQueryParameters(state)(queryParameters);
    return fetchAllRows(state)();
  };

  const fetchGivenPredecessorRows = (state) => (count) => {
    setPredecessorCount(state)(count);
    return fetchPredecessorRows(state)();
  };

  const fetchGivenSuccessorRows = (state) => (count) => {
    setSuccessorCount(state)(count);
    return fetchSuccessorRows(state)();
  };

  const fetchMorePredecessorRows = (state) => () => {
    increasePredecessorCount(state)();
    return fetchPredecessorRows(state)();
  };

  const fetchMoreSuccessorRows = (state) => () => {
    increaseSuccessorCount(state)();
    return fetchSuccessorRows(state)();
  };

  const setAllRows = (state) => (predecessorRows, anchorRow, successorRows) => (
    state.rows.all = [
      ...(predecessorRows || []),
      ...(anchorRow ? [anchorRow] : []),
      ...(successorRows || []),
    ]
  );

  return {
    fetchAllRows,
    fetchAllRowsWithNewQueryParameters,
    fetchAnchorRow,
    fetchContextRows,
    fetchContextRowsWithNewQueryParameters,
    fetchGivenPredecessorRows,
    fetchGivenSuccessorRows,
    fetchMorePredecessorRows,
    fetchMoreSuccessorRows,
    fetchPredecessorRows,
    fetchSuccessorRows,
    setAllRows,
  };
}
