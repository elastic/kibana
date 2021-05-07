/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';
import { fromPairs } from 'lodash';
import { i18n } from '@kbn/i18n';

import { getServices } from '../../../../kibana_services';
import { SEARCH_FIELDS_FROM_SOURCE } from '../../../../../common';
import { MarkdownSimple, toMountPoint } from '../../../../../../kibana_react/public';
import { fetchAnchorProvider } from '../api/anchor';
import { EsHitRecord, EsHitRecordList, fetchContextProvider, SurrDocType } from '../api/context';
import { getQueryParameterActions } from '../query_parameters';
import {
  ContextAppState,
  FailureReason,
  LoadingStatus,
  LoadingStatusEntry,
  LoadingStatusState,
  QueryParameters,
} from '../../context_app_state';

interface DiscoverPromise extends PromiseConstructor {
  try: <T>(fn: () => Promise<T>) => Promise<T>;
}

export function QueryActionsProvider(Promise: DiscoverPromise) {
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

  const setFailedStatus = (state: ContextAppState) => (
    subject: keyof LoadingStatusState,
    details: LoadingStatusEntry = {}
  ) =>
    (state.loadingStatus[subject] = {
      status: LoadingStatus.FAILED,
      reason: FailureReason.UNKNOWN,
      ...details,
    });

  const setLoadedStatus = (state: ContextAppState) => (subject: keyof LoadingStatusState) =>
    (state.loadingStatus[subject] = {
      status: LoadingStatus.LOADED,
    });

  const setLoadingStatus = (state: ContextAppState) => (subject: keyof LoadingStatusState) =>
    (state.loadingStatus[subject] = {
      status: LoadingStatus.LOADING,
    });

  const fetchAnchorRow = (state: ContextAppState) => () => {
    const {
      queryParameters: { indexPatternId, anchorId, sort, tieBreakerField },
    } = state;

    if (!tieBreakerField) {
      return Promise.reject(
        setFailedStatus(state)('anchor', {
          reason: FailureReason.INVALID_TIEBREAKER,
        })
      );
    }

    setLoadingStatus(state)('anchor');
    const [[, sortDir]] = sort;

    return Promise.try(() =>
      fetchAnchor(indexPatternId, anchorId, [fromPairs(sort), { [tieBreakerField]: sortDir }])
    ).then(
      (anchorDocument: EsHitRecord) => {
        setLoadedStatus(state)('anchor');
        state.rows.anchor = anchorDocument;
        return anchorDocument;
      },
      (error: Error) => {
        setFailedStatus(state)('anchor', { error });
        getServices().toastNotifications.addDanger({
          title: i18n.translate('discover.context.unableToLoadAnchorDocumentDescription', {
            defaultMessage: 'Unable to load the anchor document',
          }),
          text: toMountPoint(<MarkdownSimple>{error.message}</MarkdownSimple>),
        });
        throw error;
      }
    );
  };

  const fetchSurroundingRows = (type: SurrDocType, state: ContextAppState) => {
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
          reason: FailureReason.INVALID_TIEBREAKER,
        })
      );
    }

    setLoadingStatus(state)(type);
    const [[sortField, sortDir]] = sort;

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
      (documents: EsHitRecordList) => {
        setLoadedStatus(state)(type);
        state.rows[type] = documents;
        return documents;
      },
      (error: Error) => {
        setFailedStatus(state)(type, { error });
        getServices().toastNotifications.addDanger({
          title: i18n.translate('discover.context.unableToLoadDocumentDescription', {
            defaultMessage: 'Unable to load documents',
          }),
          text: toMountPoint(<MarkdownSimple>{error.message}</MarkdownSimple>),
        });
        throw error;
      }
    );
  };

  const fetchContextRows = (state: ContextAppState) => () =>
    Promise.all([
      fetchSurroundingRows('predecessors', state),
      fetchSurroundingRows('successors', state),
    ]);

  const fetchAllRows = (state: ContextAppState) => () =>
    Promise.try(fetchAnchorRow(state)).then(fetchContextRows(state));

  const fetchContextRowsWithNewQueryParameters = (state: ContextAppState) => (
    queryParameters: QueryParameters
  ) => {
    setQueryParameters(state)(queryParameters);
    return fetchContextRows(state)();
  };

  const fetchAllRowsWithNewQueryParameters = (state: ContextAppState) => (
    queryParameters: QueryParameters
  ) => {
    setQueryParameters(state)(queryParameters);
    return fetchAllRows(state)();
  };

  const fetchGivenPredecessorRows = (state: ContextAppState) => (count: number) => {
    setPredecessorCount(state)(count);
    return fetchSurroundingRows('predecessors', state);
  };

  const fetchGivenSuccessorRows = (state: ContextAppState) => (count: number) => {
    setSuccessorCount(state)(count);
    return fetchSurroundingRows('successors', state);
  };

  const setAllRows = (state: ContextAppState) => (
    predecessorRows: EsHitRecordList,
    anchorRow: EsHitRecord,
    successorRows: EsHitRecordList
  ) =>
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
