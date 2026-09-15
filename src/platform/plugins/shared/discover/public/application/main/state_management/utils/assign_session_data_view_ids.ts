/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { DataViewSpec } from '@kbn/data-views-plugin/common';
import type { Filter } from '@kbn/es-query';
import type { DiscoverSession } from '@kbn/saved-search-plugin/common';
import {
  generateInlineDataViewId,
  getDataViewSpecKey,
  getInlineDataView,
} from '../../../../../common/session/inline_data_view';
import type { TabState } from '../redux/types';

/** Fills missing inline IDs using matching local views, with the incoming link first for its tab. */
export const assignSessionDataViewIds = (
  session: DiscoverSession,
  localTabs: TabState[],
  navigation?: { tabId: string | undefined; dataViewSpec: DataViewSpec | undefined }
) => {
  // Inline Data Views are defined by their content, so the API leaves out runtime IDs.
  // Reconcile them with local tabs and the incoming link: reuse IDs when definitions match,
  // otherwise generate the same ID as the embeddable instead of saving an unrelated UUID.
  // Update filter references too, without copying local edits.
  const needsInlineIds = session.tabs.some((tab) => {
    const dataView = getInlineDataView(tab.serializedSearchSource);
    return dataView !== undefined && dataView.id === undefined;
  });

  if (!needsInlineIds) {
    // Legacy sessions already have IDs. Returning them unchanged preserves that behavior without a flag.
    return session;
  }

  // Collect all local candidates first, so a tab can reuse an ID from a later tab too.
  const { localViewsByTab, idsBySpec } = collectLocalDataViews(localTabs);

  const locationDataView = getInlineDataView({ index: navigation?.dataViewSpec });
  const targetTab = session.tabs.find((tab) => tab.id === navigation?.tabId);
  const targetDataView = getInlineDataView(targetTab?.serializedSearchSource);
  let linkDataViewId: string | undefined;
  if (targetDataView && locationDataView?.id) {
    const specKey = getDataViewSpecKey(targetDataView);
    linkDataViewId = getMatchingDataViewId(locationDataView, specKey);

    if (linkDataViewId) {
      // Other tabs with this spec can reuse the link ID even before its target tab is processed.
      idsBySpec.set(specKey, linkDataViewId);
    }
  }

  const sessionTabs = session.tabs.map((tab) => {
    const searchSource = tab.serializedSearchSource;
    const dataView = getInlineDataView(searchSource);
    if (!dataView || dataView.id !== undefined) {
      return tab;
    }

    const specKey = getDataViewSpecKey(dataView);
    const linkId = tab.id === navigation?.tabId ? linkDataViewId : undefined;
    const localId = getMatchingDataViewId(localViewsByTab.get(tab.id), specKey);
    // If no ID can be reused, use the embeddable's ID so saving in Discover
    // does not break dashboard filters that already reference this view.
    const dataViewId =
      linkId ?? localId ?? idsBySpec.get(specKey) ?? generateInlineDataViewId(dataView);

    idsBySpec.set(specKey, dataViewId);

    // Apply the chosen ID to the view and filters without an explicit Data View reference.
    return {
      ...tab,
      serializedSearchSource: {
        ...searchSource,
        index: { ...dataView, id: dataViewId },
        filter: assignFilterDataViewId(searchSource.filter, dataViewId),
      },
    };
  });

  return {
    ...session,
    tabs: sessionTabs,
  };
};

/** Collects local inline views by tab and IDs by spec so restored tabs can reuse them. */
const collectLocalDataViews = (localTabs: TabState[]) => {
  const localViewsByTab = new Map<string, DataViewSpec>();
  const idsBySpec = new Map<string, string>();
  for (const tab of localTabs) {
    const dataView = getInlineDataView(tab.initialInternalState?.serializedSearchSource);
    if (dataView?.id) {
      localViewsByTab.set(tab.id, dataView);
      idsBySpec.set(getDataViewSpecKey(dataView), dataView.id);
    }
  }

  return { localViewsByTab, idsBySpec };
};

const getMatchingDataViewId = (dataView: DataViewSpec | undefined, specKey: string) => {
  if (dataView?.id && getDataViewSpecKey(dataView) === specKey) {
    return dataView.id;
  }
  return undefined;
};

/** Binds filters without an explicit Data View, keeping references to other Data Views unchanged. */
const assignFilterDataViewId = (filters: Filter[] | undefined, dataViewId: string) =>
  filters?.map((filter) => {
    if (filter.meta.index !== undefined) {
      return filter;
    }
    return { ...filter, meta: { ...filter.meta, index: dataViewId } };
  });
