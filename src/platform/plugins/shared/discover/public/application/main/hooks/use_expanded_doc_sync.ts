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
import { fetchExpandedDoc } from '../data_fetching/fetch_expanded_doc';
import { getExpandedDocRef, matchesExpandedDocRef } from '../../../../common/expanded_doc';
import {
  DEFAULT_EXPANDED_DOC_OWNER,
  internalStateActions,
  useAppStateSelector,
  useCurrentTabAction,
  useCurrentTabSelector,
  useInternalStateDispatch,
} from '../state_management/redux';
import { useScopedServices } from '../../../components/scoped_services_provider';
import { useDiscoverServices } from '../../../hooks/use_discover_services';
import { FetchStatus } from '../../types';

/**
 * Explains a flyout showing a document that did not come from the current result set, which
 * happens when following a link to a document the recipient's search does not return. Shown in
 * place of the document pagination, which is unavailable in exactly those cases.
 */
export enum ExpandedDocNotice {
  /** The document belongs to the current results, or there is nothing to explain yet */
  None = 'None',
  /** The results that may contain the document are still loading */
  SearchingResults = 'SearchingResults',
  /** The results have settled and do not contain the document */
  NotInResults = 'NotInResults',
}

export interface ExpandedDocSyncResult {
  /** Whether a flyout should render, including before the document has been resolved */
  hasExpandedDoc: boolean;
  /** State of the direct fetch, used to render the flyout body when there is no document yet */
  requestState: ElasticRequestState;
  notice: ExpandedDocNotice;
}

/**
 * Keeps the expanded document in sync with the reference in the URL, so a shared link
 * reopens the flyout for anyone with access.
 *
 * The document is fetched directly by ID first, so the doc viewer opens immediately without
 * waiting on the main search, and is swapped for the instance from the result set once that
 * search settles. That swap is what restores flyout pagination and the row highlight, and it
 * keeps the link working when the document falls outside the current results, which is common
 * with relative time ranges.
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

  // The document fetched directly by ID, held locally rather than dispatched straight away so
  // that a single writer below decides which instance wins
  const [fetchedDoc, setFetchedDoc] = useState<DataTableRecord>();

  const isRefResolved = Boolean(
    expandedDocRef && expandedDoc && matchesExpandedDocRef(expandedDoc, expandedDocRef)
  );

  // The URL owns the flyout, so a reference that no longer matches the expanded document needs
  // fetching, and a reference that disappears (e.g. via the browser back button) needs the
  // flyout closed. Cascade owned flyouts and documents with no stable identity never write a
  // reference, so they are left alone.
  const isRestorable =
    !expandedDoc ||
    (expandedDocOwner === DEFAULT_EXPANDED_DOC_OWNER && Boolean(getExpandedDocRef(expandedDoc)));

  // A transformational query derives its rows, so they never correspond to a document that can be
  // refetched by reference, regardless of what a specific row happens to carry. This is checked
  // against the query alone, since it must gate fetching a document that has not resolved yet.
  // Whether a specific resolved document actually carries `_id`/`_index` is handled separately by
  // `isRestorable` below, which is what keeps the URL from governing non-linkable documents.
  const isEsqlTransformational = useMemo(
    () => isOfAggregateQueryType(query) && hasTransformationalCommand(query.esql),
    [query]
  );

  const rowFromResults = useMemo(
    () =>
      expandedDocRef ? rows.find((row) => matchesExpandedDocRef(row, expandedDocRef)) : undefined,
    [expandedDocRef, rows]
  );

  // A directly fetched document is only usable while it still describes the current reference,
  // which it does not after paginating the flyout or following a link to a different document
  const fetchedDocForRef =
    expandedDocRef && fetchedDoc && matchesExpandedDocRef(fetchedDoc, expandedDocRef)
      ? fetchedDoc
      : undefined;

  // The instance from the result set is the one the grid renders, so it always wins: it restores
  // flyout pagination and the row highlight, which a directly fetched copy cannot
  const resolvedDoc = rowFromResults ?? fetchedDocForRef;

  const shouldFetch =
    Boolean(expandedDocRef) &&
    !isRefResolved &&
    !resolvedDoc &&
    isRestorable &&
    !isEsqlTransformational;
  const shouldClear =
    !expandedDocRef && Boolean(expandedDoc) && isRestorable && !isEsqlTransformational;

  // Editing the query to become transformational strands a reference that can no longer be
  // resolved. Drop it without closing the open flyout, which the user has not asked to dismiss.
  const shouldClearRef = Boolean(expandedDocRef) && isEsqlTransformational;

  useEffect(() => {
    if (shouldClear) {
      dispatch(setExpandedDoc({ expandedDoc: undefined }));
    }
  }, [dispatch, setExpandedDoc, shouldClear]);

  useEffect(() => {
    if (shouldClearRef) {
      dispatch(updateAppState({ appState: { expandedDoc: undefined } }));
    }
  }, [dispatch, shouldClearRef, updateAppState]);

  // Depend on the reference values and the ES|QL text rather than the `query` object itself,
  // since app state syncing produces a new object on every parse and would otherwise restart the
  // fetch on unrelated state changes
  const docId = expandedDocRef?.id;
  const docIndex = expandedDocRef?.index;
  const esqlQueryText = isOfAggregateQueryType(query) ? query.esql : undefined;

  useEffect(() => {
    if (!shouldFetch || !docId || !docIndex) {
      return;
    }

    const abortController = new AbortController();

    setRequestState(ElasticRequestState.Loading);

    const resolveExpandedDoc = async () => {
      try {
        const record = await fetchExpandedDoc({
          ref: { id: docId, index: docIndex },
          dataView,
          esqlQueryText,
          data,
          abortSignal: abortController.signal,
        });

        // A superseded request can still resolve after a newer one has already reported its own
        // result, and applying it here would clobber that result with a stale one
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
  }, [data, dataView, docId, docIndex, esqlQueryText, scopedProfilesManager, shouldFetch]);

  // The only place the expanded document is written, so whichever request finishes first cannot
  // clobber the other: the preference above is applied on every render regardless of ordering
  useEffect(() => {
    if (resolvedDoc && resolvedDoc !== expandedDoc) {
      dispatch(setExpandedDoc({ expandedDoc: resolvedDoc }));
    }
  }, [dispatch, expandedDoc, resolvedDoc, setExpandedDoc]);

  return {
    hasExpandedDoc: Boolean(expandedDoc) || Boolean(expandedDocRef && isRestorable),
    requestState,
    notice: getExpandedDocNotice({ isOutOfResults: isRefResolved && !rowFromResults, fetchStatus }),
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

  // The document was fetched directly, but the results that may also contain it are still in
  // flight, so whether it belongs to them is not known yet
  const isFetchingResults =
    fetchStatus === FetchStatus.UNINITIALIZED ||
    fetchStatus === FetchStatus.LOADING ||
    fetchStatus === FetchStatus.PARTIAL;

  return isFetchingResults ? ExpandedDocNotice.SearchingResults : ExpandedDocNotice.NotInResults;
};
