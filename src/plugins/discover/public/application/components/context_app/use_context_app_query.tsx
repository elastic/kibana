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
import { Subject } from 'rxjs';
import { DiscoverServices } from '../../../build_services';
import { AppState, getState } from '../../angular/context_state';
import { fetchAnchorProvider } from '../../angular/context/api/anchor';
import {
  EsHitRecord,
  EsHitRecordList,
  fetchContextProvider,
  SurrDocType,
} from '../../angular/context/api/context';
import { MarkdownSimple, toMountPoint } from '../../../../../kibana_react/public';

export type ContextAppMessage = Partial<AppState>;

export function useContextAppQuery({
  services,
  useNewFieldsApi,
  state,
}: {
  services: DiscoverServices;
  state: AppState;
  useNewFieldsApi: boolean;
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

  const context$ = useMemo(() => new Subject<ContextAppMessage>(), []);

  const fetchAnchorRow = useCallback(() => {
    const {
      queryParameters: { indexPatternId, anchorId, tieBreakerField },
      sort,
    } = state;

    if (!tieBreakerField) {
      // reject
    }

    // set loading
    const [[, sortDir]] = sort;

    return fetchAnchor(indexPatternId, anchorId, [
      fromPairs(sort),
      { [tieBreakerField]: sortDir },
    ]).then(
      (anchorDocument: EsHitRecord) => {
        // set loaded
        context$.next({
          rows: {
            ...state.rows,
            anchor: anchorDocument,
          },
        });
      },
      (error: Error) => {
        // set errors
        toastNotifications.addDanger({
          title: i18n.translate('discover.context.unableToLoadAnchorDocumentDescription', {
            defaultMessage: 'Unable to load the anchor document',
          }),
          text: toMountPoint(<MarkdownSimple>{error.message}</MarkdownSimple>),
        });
        throw error;
      }
    );
  }, [fetchAnchor, state, toastNotifications, context$]);

  const fetchSurroundingRows = useCallback(
    (type: SurrDocType) => {
      const {
        queryParameters: { indexPatternId, tieBreakerField },
        rows: { anchor },
        sort,
      } = state;
      const filters = filterManager.getFilters();

      const count =
        type === 'successors'
          ? state.queryParameters.successorCount
          : state.queryParameters.predecessorCount;

      if (!tieBreakerField) {
        // reject request
      }

      // set loading
      const [[sortField, sortDir]] = sort;

      return fetchSurroundingDocs(
        type,
        indexPatternId,
        anchor,
        sortField,
        tieBreakerField,
        sortDir,
        count,
        filters
      ).then(
        (documents: EsHitRecordList) => {
          // set loaded
          return documents;
        },
        (error: Error) => {
          // set error
          toastNotifications.addDanger({
            title: i18n.translate('discover.context.unableToLoadDocumentDescription', {
              defaultMessage: 'Unable to load documents',
            }),
            text: toMountPoint(<MarkdownSimple>{error.message}</MarkdownSimple>),
          });
          throw error;
        }
      );
    },
    [toastNotifications, fetchSurroundingDocs, filterManager, state]
  );

  const fetchAllRows = useCallback(() => {
    fetchAnchorRow()?.then(() => {
      Promise.all([fetchSurroundingRows('predecessors'), fetchSurroundingRows('successors')]).then(
        ([predecessors, successors]) => {
          context$.next({
            rows: {
              ...state.rows,
              all: [
                ...(predecessors || []),
                ...(state.rows.anchor ? [state.rows.anchor] : []),
                ...(successors || []),
              ],
            },
          });
        }
      );
    });
  }, [fetchAnchorRow, fetchSurroundingRows, state, context$]);

  return { context$, fetchAnchorRow, fetchAllRows };
}
