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
import { i18n } from '@kbn/i18n';
import React from 'react';
import { getServices, SearchSource } from '../../../../kibana_services';

import { fetchAnchorProvider } from '../api/anchor';
import { fetchContextProvider } from '../api/context';
import { getQueryParameterActions } from '../query_parameters';
import { FAILURE_REASONS, LOADING_STATUS } from './constants';
import { MarkdownSimple } from '../../../../../../../kibana_react/public';

export function QueryActionsProvider(Promise) {
  const fetchAnchor = fetchAnchorProvider(getServices().indexPatterns, new SearchSource());
  const { fetchSurroundingDocs } = fetchContextProvider(getServices().indexPatterns);
  const { setPredecessorCount, setQueryParameters, setSuccessorCount } = getQueryParameterActions();

  const setFailedStatus = state => (subject, details = {}) =>
    (state.loadingStatus[subject] = {
      status: LOADING_STATUS.FAILED,
      reason: FAILURE_REASONS.UNKNOWN,
      ...details,
    });

  const setLoadedStatus = state => subject =>
    (state.loadingStatus[subject] = {
      status: LOADING_STATUS.LOADED,
    });

  const setLoadingStatus = state => subject =>
    (state.loadingStatus[subject] = {
      status: LOADING_STATUS.LOADING,
    });

  const fetchAnchorRow = state => () => {
    const {
      queryParameters: { indexPatternId, anchorId, sort, tieBreakerField },
    } = state;

    if (!tieBreakerField) {
      return Promise.reject(
        setFailedStatus(state)('anchor', {
          reason: FAILURE_REASONS.INVALID_TIEBREAKER,
        })
      );
    }

    setLoadingStatus(state)('anchor');

    return Promise.try(() =>
      fetchAnchor(indexPatternId, anchorId, [_.zipObject([sort]), { [tieBreakerField]: sort[1] }])
    ).then(
      anchorDocument => {
        setLoadedStatus(state)('anchor');
        state.rows.anchor = anchorDocument;
        return anchorDocument;
      },
      error => {
        setFailedStatus(state)('anchor', { error });
        getServices().toastNotifications.addDanger({
          title: i18n.translate('kbn.context.unableToLoadAnchorDocumentDescription', {
            defaultMessage: 'Unable to load the anchor document',
          }),
          text: <MarkdownSimple>{error.message}</MarkdownSimple>,
        });
        throw error;
      }
    );
  };

  const fetchSurroundingRows = (type, state) => {
    const {
      queryParameters: { indexPatternId, sort, tieBreakerField },
      rows: { anchor },
    } = state;
    const filters = getServices().filterManager.getFilters();

    const count =
      type === 'successors'
        ? state.queryParameters.successorCount
        : state.queryParameters.predecessorCount;

    if (!tieBreakerField) {
      return Promise.reject(
        setFailedStatus(state)(type, {
          reason: FAILURE_REASONS.INVALID_TIEBREAKER,
        })
      );
    }

    setLoadingStatus(state)(type);
    const [sortField, sortDir] = sort;

    return Promise.try(() =>
      fetchSurroundingDocs(
        type,
        indexPatternId,
        anchor,
        sortField,
        tieBreakerField,
        sortDir,
        count,
        filters
      )
    ).then(
      documents => {
        setLoadedStatus(state)(type);
        state.rows[type] = documents;
        return documents;
      },
      error => {
        setFailedStatus(state)(type, { error });
        getServices().toastNotifications.addDanger({
          title: i18n.translate('kbn.context.unableToLoadDocumentDescription', {
            defaultMessage: 'Unable to load documents',
          }),
          text: <MarkdownSimple>{error.message}</MarkdownSimple>,
        });
        throw error;
      }
    );
  };

  const fetchContextRows = state => () =>
    Promise.all([
      fetchSurroundingRows('predecessors', state),
      fetchSurroundingRows('successors', state),
    ]);

  const fetchAllRows = state => () =>
    Promise.try(fetchAnchorRow(state)).then(fetchContextRows(state));

  const fetchContextRowsWithNewQueryParameters = state => queryParameters => {
    setQueryParameters(state)(queryParameters);
    return fetchContextRows(state)();
  };

  const fetchAllRowsWithNewQueryParameters = state => queryParameters => {
    setQueryParameters(state)(queryParameters);
    return fetchAllRows(state)();
  };

  const fetchGivenPredecessorRows = state => count => {
    setPredecessorCount(state)(count);
    return fetchSurroundingRows('predecessors', state);
  };

  const fetchGivenSuccessorRows = state => count => {
    setSuccessorCount(state)(count);
    return fetchSurroundingRows('successors', state);
  };

  const setAllRows = state => (predecessorRows, anchorRow, successorRows) =>
    (state.rows.all = [
      ...(predecessorRows || []),
      ...(anchorRow ? [anchorRow] : []),
      ...(successorRows || []),
    ]);

  return {
    fetchAllRows,
    fetchAllRowsWithNewQueryParameters,
    fetchAnchorRow,
    fetchContextRows,
    fetchContextRowsWithNewQueryParameters,
    fetchGivenPredecessorRows,
    fetchGivenSuccessorRows,
    setAllRows,
  };
}
