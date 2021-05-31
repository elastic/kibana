/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import React, { useCallback, useMemo } from 'react';
import { i18n } from '@kbn/i18n';

import { fromPairs } from 'lodash';
import { DiscoverServices } from '../../../build_services';
import { fetchAnchorProvider } from '../../angular/context/api/anchor';
import { EsHitRecord, fetchContextProvider, SurrDocType } from '../../angular/context/api/context';
import { MarkdownSimple, toMountPoint } from '../../../../../kibana_react/public';
import { esFilters, IndexPatternField } from '../../../../../data/public';
import { FailureReason, LoadingStatus } from '../../angular/context_query_state';
import { AppState, GetStateReturn } from '../../angular/context_state';
import { popularizeField } from '../../helpers/popularize_field';

export function useContextAppActions({
  anchorId,
  indexPatternId,
  state,
  useNewFieldsApi,
  services,
  setAppState,
}: {
  anchorId: string;
  indexPatternId: string;
  state: AppState;
  useNewFieldsApi: boolean;
  services: DiscoverServices;
  setAppState: GetStateReturn['setAppState'];
}) {
  const { data, indexPatterns, toastNotifications, filterManager } = services;

  const searchSource = useMemo(() => {
    return data.search.searchSource.createEmpty();
  }, [data.search.searchSource]);

  const fetchAnchor = useMemo(() => {
    return fetchAnchorProvider(indexPatterns, searchSource, useNewFieldsApi);
  }, [indexPatterns, searchSource, useNewFieldsApi]);

  const { fetchSurroundingDocs } = useMemo(
    () => fetchContextProvider(indexPatterns, useNewFieldsApi),
    [indexPatterns, useNewFieldsApi]
  );

  const fetchAnchorRow = useCallback(() => {
    const { sort, tieBreakerField } = state;

    const [[, sortDir]] = sort;

    setAppState({ anchorStatus: LoadingStatus.LOADING });
    return fetchAnchor(indexPatternId, anchorId, [fromPairs(sort), { [tieBreakerField]: sortDir }])
      .then((anchor) => {
        setAppState({ anchor, anchorStatus: LoadingStatus.LOADED });
        return anchor;
      })
      .catch((error) => {
        setAppState({
          anchorStatus: { status: LoadingStatus.FAILED, reason: FailureReason.UNKNOWN, error },
        });
        toastNotifications.addDanger({
          title: i18n.translate('discover.context.unableToLoadAnchorDocumentDescription', {
            defaultMessage: 'Unable to load the anchor document',
          }),
          text: toMountPoint(<MarkdownSimple>{error.message}</MarkdownSimple>),
        });
        throw error;
      });
  }, [setAppState, fetchAnchor, indexPatternId, anchorId, toastNotifications, state]);

  const fetchSurroundingRows = useCallback(
    (type: SurrDocType, fetchedAnchor?: EsHitRecord) => {
      const filters = filterManager.getFilters();
      const { tieBreakerField, sort } = state;
      const [[sortField, sortDir]] = sort;

      const count = type === 'predecessors' ? state.predecessorCount : state.successorCount;
      const anchor = fetchedAnchor || state.anchor;

      setAppState({
        [`${type}Status`]: LoadingStatus.LOADING,
      });

      return fetchSurroundingDocs(
        type,
        indexPatternId,
        anchor,
        sortField,
        tieBreakerField,
        sortDir,
        count,
        filters
      )
        .then((hits) => {
          setAppState({ [type]: hits, [`${type}Status`]: LoadingStatus.LOADED });
        })
        .catch((error) => {
          toastNotifications.addDanger({
            title: i18n.translate('discover.context.unableToLoadDocumentDescription', {
              defaultMessage: 'Unable to load documents',
            }),
            text: toMountPoint(<MarkdownSimple>{error.message}</MarkdownSimple>),
          });
          throw error;
        });
    },
    [fetchSurroundingDocs, filterManager, indexPatternId, setAppState, state, toastNotifications]
  );

  const fetchContextRows = useCallback(
    (anchor) => {
      return Promise.allSettled([
        fetchSurroundingRows('predecessors', anchor),
        fetchSurroundingRows('successors', anchor),
      ]);
    },
    [fetchSurroundingRows]
  );

  const fetchAllRows = useCallback(() => fetchAnchorRow().then(fetchContextRows).catch(Error), [
    fetchAnchorRow,
    fetchContextRows,
  ]);

  const addFilter = useCallback(
    async (field: IndexPatternField | string, values: unknown, operation: string) => {
      const newFilters = esFilters.generateFilters(
        filterManager,
        field,
        values,
        operation,
        indexPatternId
      );
      filterManager.addFilters(newFilters);
      if (indexPatterns) {
        const indexPattern = await indexPatterns.get(indexPatternId);
        const fieldName = typeof field === 'string' ? field : field.name;
        await popularizeField(indexPattern, fieldName, indexPatterns);
      }
    },
    [filterManager, indexPatternId, indexPatterns]
  );

  return { fetchSurroundingRows, fetchContextRows, fetchAllRows, addFilter };
}
