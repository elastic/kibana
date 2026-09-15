/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { cloneDeep, isPlainObject } from 'lodash';
import { toStoredTags } from '@kbn/as-code-shared-transforms';
import { mapAndFlattenFilters } from '@kbn/data-plugin/public';
import { extractReferences, type SerializedSearchSourceFields } from '@kbn/data-plugin/common';
import type { DiscoverSession, DiscoverSessionTab } from '@kbn/saved-search-plugin/common';
import type { DiscoverSessionApiTab, DiscoverSessionApiData } from '@kbn/as-code-discover-schema';
import {
  deserializeEsqlControls,
  serializeEsqlControls,
} from '../../common/session/control_panels';
import {
  applySessionTabTypeState,
  toStoredSessionSettings,
  fromStoredSessionSearchAndTable,
  fromStoredSessionSettings,
} from '../../common/session/session_tab_mapping';
import {
  fromStoredSearchAndTable,
  toStoredSearchAndTable,
  toStoredSearchSource,
} from '../../common/session/search_and_table_mapping';
import { toStoredTabTypeState } from '../../common/session/tab_type_state';
import { getVisContextRequestData } from '../../common/session/get_vis_context_request_data';
import type { DiscoverSessionApiResponse } from '../../server';
import type {
  DiscoverSessionClientRequestData,
  DiscoverSessionClientRequestTab,
  DiscoverSessionResolveMetadata,
} from './api_client';
import { fromApiVisContext, toApiVisContext } from '../../common/session/vis_context';

// Converts between API documents and Discover's in-memory sessions, including their references.
// Shared conversions map the fields directly; this file assembles tabs, references, and metadata.
// Reads apply filter defaults; writes keep the client chart and control checks.
// It does not build Saved Object attributes or serialize the SearchSource; tab restoration assigns IDs.

/** Builds a Discover session from API data, including filter defaults and URL-resolution metadata. */
export const fromDiscoverSessionApiResponse = (
  response: DiscoverSessionApiResponse,
  resolve?: DiscoverSessionResolveMetadata
): DiscoverSession => {
  const { id, data, meta } = response;
  const tabsWithReferences = data.tabs.map(fromApiTabToDiscoverTab);
  const { references: tagReferences } = toStoredTags({ tags: data.tags });

  return {
    id,
    title: data.title,
    description: data.description,
    tags: data.tags,
    tabs: tabsWithReferences.map(({ tab }) => tab),
    managed: meta.managed ?? false,
    references: [...tagReferences, ...tabsWithReferences.flatMap(({ references }) => references)],
    ...(resolve?.outcome !== undefined && { sharingSavedObjectProps: resolve }),
  };
};

/** Converts a Discover session into a create or upsert request body. */
export const toDiscoverSessionApiData = (
  session: Pick<DiscoverSession, 'title' | 'description' | 'tabs' | 'tags'>
): DiscoverSessionClientRequestData => ({
  title: session.title,
  description: session.description,
  ...(session.tags !== undefined && { tags: session.tags }),
  tabs: session.tabs.map(fromDiscoverTabToApiTab),
});

/** Extracts references from tags and search fields without converting the rest of the session. */
export const getDiscoverSessionReferences = (data: DiscoverSessionApiData) => {
  const { references: tagReferences } = toStoredTags({ tags: data.tags });
  const tabReferences = data.tabs.flatMap((tab) => {
    const [, references] = extractReferences(toStoredSearchSource(tab), {
      refNamePrefix: `tab_${tab.id}`,
    });
    return references;
  });
  return [...tagReferences, ...tabReferences];
};

const fromApiTabToDiscoverTab = (apiTab: DiscoverSessionApiTab) => {
  const { serializedSearchSource, ...tabFields } = toStoredSearchAndTable(apiTab);
  const [, references] = extractReferences(serializedSearchSource, {
    refNamePrefix: `tab_${apiTab.id}`,
  });
  const tabTypeState = toStoredTabTypeState(apiTab);
  const tab: DiscoverSessionTab = {
    id: apiTab.id,
    label: apiTab.label,
    ...tabFields,
    ...toStoredSessionSettings(apiTab),
    serializedSearchSource: normalizeSearchSourceFilters(serializedSearchSource),
    visContext: fromApiVisContext(apiTab.vis_context, getVisContextRequestData(apiTab)),
    controlGroupJson: serializeEsqlControls(apiTab.control_panels),
    ...(tabTypeState !== undefined && { tabTypeState }),
  };
  return { tab, references };
};

const fromDiscoverTabToApiTab = (tab: DiscoverSessionTab): DiscoverSessionClientRequestTab => {
  const searchAndTableFields = tab.isTextBasedQuery
    ? fromStoredSearchAndTable(tab, tab.serializedSearchSource)
    : fromStoredSessionSearchAndTable(tab, tab.serializedSearchSource);

  const apiTab = applySessionTabTypeState(
    {
      id: tab.id,
      label: tab.label,
      ...searchAndTableFields,
      ...fromStoredSessionSettings(tab),
    },
    tab.tabTypeState
  );
  const visContext = getApiVisContext(tab.visContext);
  const controlPanels = deserializeEsqlControls(tab.controlGroupJson);

  return {
    ...apiTab,
    ...(visContext !== undefined && { vis_context: visContext }),
    ...(controlPanels !== undefined && { control_panels: controlPanels }),
  };
};

/** Omits chart state without object attributes before applying the shared API conversion. */
const getApiVisContext = (visContext: DiscoverSessionTab['visContext']) => {
  if (!visContext || !('attributes' in visContext) || !isPlainObject(visContext.attributes)) {
    return undefined;
  }

  return toApiVisContext(visContext);
};

/** Applies FilterManager's defaults to copied filters so opening a session does not look like an edit. */
const normalizeSearchSourceFilters = (searchSource: SerializedSearchSourceFields) => {
  const { filter } = searchSource;
  if (!filter) {
    return searchSource;
  }

  return {
    ...searchSource,
    filter: mapAndFlattenFilters(cloneDeep(filter)),
  };
};
