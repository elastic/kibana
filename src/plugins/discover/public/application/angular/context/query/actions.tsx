/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import _ from 'lodash';
import { i18n } from '@kbn/i18n';
import { getServices } from '../../../../kibana_services';
// @ts-ignore
import { fetchAnchorProvider } from '../api/anchor';
import { fetchContextProvider, SurrDocType } from '../api/context';
// @ts-ignore
import { getQueryParameterActions } from '../query_parameters';
import { FAILURE_REASONS, LOADING_STATUS } from './index';
import { SEARCH_FIELDS_FROM_SOURCE } from '../../../../../common';

export function queryActionsProvider() {
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

  const setFailedStatus = (state: any) => (subject: string, details = {}) =>
    (state.loadingStatus[subject] = {
      status: LOADING_STATUS.FAILED,
      reason: FAILURE_REASONS.UNKNOWN,
      ...details,
    });

  const setLoadedStatus = (state: any) => (subject: string) =>
    (state.loadingStatus[subject] = {
      status: LOADING_STATUS.LOADED,
    });

  const setLoadingStatus = (state: any) => (subject: string) =>
    (state.loadingStatus[subject] = {
      status: LOADING_STATUS.LOADING,
    });

  const fetchAnchorRow = (state: any) => async () => {
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

    try {
      const doc = await fetchAnchor(indexPatternId, anchorId, [
        _.fromPairs([sort]),
        { [tieBreakerField]: sort[1] },
      ]);
      setLoadedStatus(state)('anchor');
      state.rows.anchor = doc;
      return doc;
    } catch (error) {
      setFailedStatus(state)('anchor', { error });
      getServices().toastNotifications.addDanger({
        title: i18n.translate('discover.context.unableToLoadAnchorDocumentDescription', {
          defaultMessage: 'Unable to load the anchor document',
        }),
        text: error.message,
      });
      throw error;
    }
  };

  const fetchSurroundingRows = async (type: string, state: any) => {
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

    try {
      const documents = await fetchSurroundingDocs(
        type as SurrDocType,
        indexPatternId,
        anchor,
        sortField,
        tieBreakerField,
        sortDir,
        count,
        filters
      );
      setLoadedStatus(state)(type);
      state.rows[type] = documents;
      return documents;
    } catch (error) {
      setFailedStatus(state)(type, { error });
      getServices().toastNotifications.addDanger({
        title: i18n.translate('discover.context.unableToLoadDocumentDescription', {
          defaultMessage: 'Unable to load documents',
        }),
        text: error.message,
      });
      throw error;
    }
  };

  const fetchContextRows = (state: any) => () =>
    Promise.all([
      fetchSurroundingRows('predecessors', state),
      fetchSurroundingRows('successors', state),
    ]);

  const fetchAllRows = (state: any) => async () => {
    try {
      await fetchAnchorRow(state)();
      return fetchContextRows(state);
    } catch (error) {
      setFailedStatus(state)('fetchAllRows', { error });
      return Promise.reject('no!');
    }
  };

  const fetchContextRowsWithNewQueryParameters = (state: any) => (queryParameters: any) => {
    setQueryParameters(state)(queryParameters);
    return fetchContextRows(state)();
  };

  const fetchAllRowsWithNewQueryParameters = (state: any) => (queryParameters: any) => {
    setQueryParameters(state)(queryParameters);
    return fetchAllRows(state)();
  };

  const fetchGivenPredecessorRows = (state: any) => (count: any) => {
    setPredecessorCount(state)(count);
    return fetchSurroundingRows('predecessors', state);
  };

  const fetchGivenSuccessorRows = (state: any) => (count: any) => {
    setSuccessorCount(state)(count);
    return fetchSurroundingRows('successors', state);
  };

  const setAllRows = (state: any) => (predecessorRows: any, anchorRow: any, successorRows: any) =>
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
