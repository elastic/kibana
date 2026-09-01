/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { useEffect, useMemo, useState } from 'react';
import type { DataView } from '@kbn/data-views-plugin/public';
import type { DataTableRecord } from '@kbn/discover-utils/types';
import { isOfAggregateQueryType } from '@kbn/es-query';
import { hasTransformationalCommand } from '@kbn/esql-utils';
import { ElasticRequestState } from '@kbn/unified-doc-viewer';
import { fetchExpandedDoc } from '../../data_fetching/fetch_expanded_doc';
import {
  getExpandedDocRef,
  isEsqlSourceCommandLinkable,
  matchesExpandedDocRef,
  type ExpandedDocRef,
} from '../../utils/expanded_doc';
import {
  DEFAULT_EXPANDED_DOC_OWNER,
  internalStateActions,
  useAppStateSelector,
  useCurrentTabAction,
  useCurrentTabSelector,
  useInternalStateDispatch,
} from '../../state_management/redux';
import { useScopedServices } from '../../../../components/scoped_services_provider';
import { useDiscoverServices } from '../../../../hooks/use_discover_services';
import { FetchStatus } from '../../../types';

/** Describes why a linked document is unavailable in the current results. */
export enum ExpandedDocNotice {
  /** The document belongs to the current results, or there is nothing to explain yet */
  None = 'None',
  /** The results that may contain the document are still loading */
  SearchingResults = 'SearchingResults',
  /** The results have settled and do not contain the document */
  NotInResults = 'NotInResults',
}

export interface ExpandedDocSyncResult {
  /** Whether to render a flyout before or after its document resolves. */
  hasExpandedDoc: boolean;
  /** State of the direct document fetch. */
  requestState: ElasticRequestState;
  notice: ExpandedDocNotice;
  /** The reference behind the current `requestState`, for display when it can't be resolved. */
  expandedDocRef: ExpandedDocRef | undefined;
}

/**
 * Keeps the expanded document in sync with the reference in the URL, so a shared link
 * reopens the flyout for anyone with access.
 *
 * The document is fetched directly by ID first, opening the doc viewer immediately,
 * and then swapped out for the search results instance once the main search settles.
 * The direct fetch keeps the link working when the document falls outside the current
 * results (e.g. with relative time ranges), and the swap restores flyout pagination
 * and row highlighting when possible.
 */
export const useExpandedDocSync = ({
  dataView,
  rows,
  fetchStatus,
}: {
  dataView: DataView;
  rows: DataTableRecord[];
  fetchStatus: FetchStatus;
}): ExpandedDocSyncResult => {
  const { data } = useDiscoverServices();
  const { scopedProfilesManager } = useScopedServices();
  const dispatch = useInternalStateDispatch();
  const setExpandedDoc = useCurrentTabAction(internalStateActions.setExpandedDoc);
  const updateAppState = useCurrentTabAction(internalStateActions.updateAppState);
  const query = useAppStateSelector((state) => state.query);
  const expandedDocRef = useCurrentTabSelector((tab) => tab.appState.expandedDoc);
  const expandedDoc = useCurrentTabSelector((tab) => tab.expandedDoc);
  const expandedDocOwner = useCurrentTabSelector((tab) => tab.expandedDocOwner);
  const [requestState, setRequestState] = useState(ElasticRequestState.Loading);
  const isEsqlQuery = isOfAggregateQueryType(query);
  const isEsqlRoutedRef = Boolean(isEsqlQuery && expandedDocRef?.routing);

  // Keep direct result local so one writer below decides whether it or the result row wins.
  const [fetchedDoc, setFetchedDoc] = useState<DataTableRecord>();

  const isRefResolved = Boolean(
    expandedDocRef && expandedDoc && matchesExpandedDocRef(expandedDoc, expandedDocRef)
  );

  // URL state owns restorable flyouts; cascade and non-linkable flyouts remain locally owned.
  const isRestorable =
    !expandedDoc ||
    (expandedDocOwner === DEFAULT_EXPANDED_DOC_OWNER && Boolean(getExpandedDocRef(expandedDoc)));

  // Gate unresolved fetches by query because only supported, non-transformational rows can be refetched.
  const isEsqlUnrestorable = useMemo(() => {
    return (
      isEsqlQuery &&
      (!isEsqlSourceCommandLinkable(query.esql) || hasTransformationalCommand(query.esql))
    );
  }, [isEsqlQuery, query]);

  const rowFromResults = useMemo(
    () =>
      expandedDocRef ? rows.find((row) => matchesExpandedDocRef(row, expandedDocRef)) : undefined,
    [expandedDocRef, rows]
  );

  // Ignore a direct result after navigation changes the reference.
  const fetchedDocForRef =
    expandedDocRef && fetchedDoc && matchesExpandedDocRef(fetchedDoc, expandedDocRef)
      ? fetchedDoc
      : undefined;

  // Prefer the grid's row to restore pagination and highlighting.
  const resolvedDoc = rowFromResults ?? fetchedDocForRef;

  const shouldFetch =
    Boolean(expandedDocRef) &&
    !isRefResolved &&
    !resolvedDoc &&
    isRestorable &&
    !isEsqlUnrestorable &&
    !isEsqlRoutedRef;
  const shouldClear =
    Boolean(expandedDoc) && !isRefResolved && isRestorable && !isEsqlUnrestorable && !resolvedDoc;

  // Drop an unresolvable reference without closing the flyout the user still has open.
  const shouldClearRef = Boolean(expandedDocRef) && isEsqlUnrestorable;

  useEffect(() => {
    if (shouldClear) {
      dispatch(setExpandedDoc({ expandedDoc: undefined, shouldUpdateUrl: false }));
    }
  }, [dispatch, setExpandedDoc, shouldClear]);

  useEffect(() => {
    if (shouldClearRef) {
      dispatch(updateAppState({ appState: { expandedDoc: undefined } }));
    }
  }, [dispatch, shouldClearRef, updateAppState]);

  // Primitive dependencies avoid refetching when app state reparses an equivalent query object.
  const docId = expandedDocRef?.id;
  const docIndex = expandedDocRef?.index;
  const docRouting = expandedDocRef?.routing;
  const esqlQueryText = isEsqlQuery ? query.esql : undefined;

  useEffect(() => {
    if (!shouldFetch || !docId || !docIndex) {
      return;
    }

    const abortController = new AbortController();

    setRequestState(ElasticRequestState.Loading);

    const resolveExpandedDoc = async () => {
      try {
        const record = await fetchExpandedDoc({
          ref: { id: docId, index: docIndex, ...(docRouting ? { routing: docRouting } : {}) },
          dataView,
          esqlQueryText,
          data,
          abortSignal: abortController.signal,
        });

        // Ignore a superseded request that resolves after its replacement.
        if (abortController.signal.aborted) {
          return;
        }

        if (!record) {
          setRequestState(ElasticRequestState.NotFound);
          return;
        }

        setRequestState(ElasticRequestState.Found);
        setFetchedDoc(scopedProfilesManager.resolveDocumentProfile({ record }));
      } catch {
        if (!abortController.signal.aborted) {
          setRequestState(ElasticRequestState.Error);
        }
      }
    };

    resolveExpandedDoc();

    return () => {
      abortController.abort();
    };
  }, [
    data,
    dataView,
    docId,
    docIndex,
    docRouting,
    esqlQueryText,
    scopedProfilesManager,
    shouldFetch,
  ]);

  // One writer preserves result-row preference regardless of request ordering.
  useEffect(() => {
    if (resolvedDoc && resolvedDoc !== expandedDoc) {
      dispatch(setExpandedDoc({ expandedDoc: resolvedDoc }));
    }
  }, [dispatch, expandedDoc, resolvedDoc, setExpandedDoc]);

  return {
    hasExpandedDoc: Boolean(expandedDoc) || Boolean(expandedDocRef && isRestorable),
    requestState: isEsqlRoutedRef ? ElasticRequestState.Error : requestState,
    notice: getExpandedDocNotice({ isOutOfResults: isRefResolved && !rowFromResults, fetchStatus }),
    expandedDocRef,
  };
};

const getExpandedDocNotice = ({
  isOutOfResults,
  fetchStatus,
}: {
  isOutOfResults: boolean;
  fetchStatus: FetchStatus;
}): ExpandedDocNotice => {
  if (!isOutOfResults) {
    return ExpandedDocNotice.None;
  }

  // Result membership remains unknown while the main search is in flight.
  const isFetchingResults =
    fetchStatus === FetchStatus.UNINITIALIZED ||
    fetchStatus === FetchStatus.LOADING ||
    fetchStatus === FetchStatus.PARTIAL;

  return isFetchingResults ? ExpandedDocNotice.SearchingResults : ExpandedDocNotice.NotInResults;
};
