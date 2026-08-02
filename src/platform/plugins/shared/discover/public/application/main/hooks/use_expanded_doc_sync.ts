/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { useEffect, useMemo, useState } from 'react';
import { lastValueFrom } from 'rxjs';
import type { DataView } from '@kbn/data-views-plugin/public';
import type { DataTableRecord } from '@kbn/discover-utils/types';
import { buildDataTableRecord } from '@kbn/discover-utils';
import { ElasticRequestState } from '@kbn/unified-doc-viewer';
import { buildSearchBody } from '@kbn/unified-doc-viewer-plugin/public';
import { getExpandedDocRef, matchesExpandedDocRef } from '../../../../common/expanded_doc';
import {
  DEFAULT_EXPANDED_DOC_OWNER,
  internalStateActions,
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

  const shouldFetch = Boolean(expandedDocRef) && !isRefResolved && !resolvedDoc && isRestorable;
  const shouldClear = !expandedDocRef && Boolean(expandedDoc) && isRestorable;

  useEffect(() => {
    if (shouldClear) {
      dispatch(setExpandedDoc({ expandedDoc: undefined }));
    }
  }, [dispatch, setExpandedDoc, shouldClear]);

  // Depend on the reference values rather than the object, since URL syncing produces a new
  // object on every parse and would otherwise refetch on unrelated state changes
  const docId = expandedDocRef?.id;
  const docIndex = expandedDocRef?.index;

  useEffect(() => {
    if (!shouldFetch || !docId || !docIndex) {
      return;
    }

    const abortController = new AbortController();

    setRequestState(ElasticRequestState.Loading);

    const fetchExpandedDoc = async () => {
      try {
        const response = await lastValueFrom(
          data.search.search(
            {
              params: {
                index: dataView.getIndexPattern(),
                ...buildSearchBody(docId, docIndex, dataView),
              },
            },
            { abortSignal: abortController.signal }
          )
        );
        const rawHit = response.rawResponse.hits?.hits?.[0];

        if (!rawHit) {
          setRequestState(ElasticRequestState.NotFound);
          return;
        }

        setRequestState(ElasticRequestState.Found);
        setFetchedDoc(
          scopedProfilesManager.resolveDocumentProfile({
            record: buildDataTableRecord(rawHit, dataView),
          })
        );
      } catch {
        if (!abortController.signal.aborted) {
          setRequestState(ElasticRequestState.Error);
        }
      }
    };

    fetchExpandedDoc();

    return () => {
      abortController.abort();
    };
  }, [data.search, dataView, docId, docIndex, scopedProfilesManager, shouldFetch]);

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
