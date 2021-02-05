/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import _ from 'lodash';
import { i18n } from '@kbn/i18n';
import React from 'react';
import { getServices } from '../../../../kibana_services';

import { fetchAnchorProvider } from '../api/anchor';
import { fetchContextProvider } from '../api/context';
import { getQueryParameterActions } from '../query_parameters';
import { FAILURE_REASONS, LOADING_STATUS } from './index';
import { MarkdownSimple } from '../../../../../../kibana_react/public';
import { SEARCH_FIELDS_FROM_SOURCE } from '../../../../../common';

export function QueryActionsProvider(Promise) {
  const { filterManager, indexPatterns, data, uiSettings } = getServices();
  const useNewFieldsApi = !uiSettings.get(SEARCH_FIELDS_FROM_SOURCE);
  const fetchAnchor = fetchAnchorProvider(
    indexPatterns,
    data.search.searchSource.createEmpty(),
    useNewFieldsApi
  );
  const { fetchSurroundingDocs } = fetchContextProvider(indexPatterns, useNewFieldsApi);
  const { setPredecessorCount, setQueryParameters, setSuccessorCount } = getQueryParameterActions(
    filterManager,
    indexPatterns
  );

  const setFailedStatus = (state) => (subject, details = {}) =>
    (state.loadingStatus[subject] = {
      status: LOADING_STATUS.FAILED,
      reason: FAILURE_REASONS.UNKNOWN,
      ...details,
    });

  const setLoadedStatus = (state) => (subject) =>
    (state.loadingStatus[subject] = {
      status: LOADING_STATUS.LOADED,
    });

  const setLoadingStatus = (state) => (subject) =>
    (state.loadingStatus[subject] = {
      status: LOADING_STATUS.LOADING,
    });

  const fetchAnchorRow = (state) => () => {
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
      fetchAnchor(indexPatternId, anchorId, [_.fromPairs([sort]), { [tieBreakerField]: sort[1] }])
    ).then(
      (anchorDocument) => {
        setLoadedStatus(state)('anchor');
        state.rows.anchor = anchorDocument;
        return anchorDocument;
      },
      (error) => {
        setFailedStatus(state)('anchor', { error });
        getServices().toastNotifications.addDanger({
          title: i18n.translate('discover.context.unableToLoadAnchorDocumentDescription', {
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
      (documents) => {
        setLoadedStatus(state)(type);
        state.rows[type] = documents;
        return documents;
      },
      (error) => {
        setFailedStatus(state)(type, { error });
        getServices().toastNotifications.addDanger({
          title: i18n.translate('discover.context.unableToLoadDocumentDescription', {
            defaultMessage: 'Unable to load documents',
          }),
          text: <MarkdownSimple>{error.message}</MarkdownSimple>,
        });
        throw error;
      }
    );
  };

  const fetchContextRows = (state) => () =>
    Promise.all([
      fetchSurroundingRows('predecessors', state),
      fetchSurroundingRows('successors', state),
    ]);

  const fetchAllRows = (state) => () =>
    Promise.try(fetchAnchorRow(state)).then(fetchContextRows(state));

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
    return fetchSurroundingRows('predecessors', state);
  };

  const fetchGivenSuccessorRows = (state) => (count) => {
    setSuccessorCount(state)(count);
    return fetchSurroundingRows('successors', state);
  };

  const setAllRows = (state) => (predecessorRows, anchorRow, successorRows) =>
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
