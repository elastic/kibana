/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { toStoredTags } from '@kbn/as-code-shared-transforms';
import type { DiscoverSessionApiData, DiscoverSessionApiTab } from '@kbn/as-code-discover-schema';
import type { SavedObjectReference } from '@kbn/core/server';
import type { StoredDiscoverSession } from '@kbn/saved-search-plugin/common';
import type { DiscoverSessionAttributes } from '@kbn/saved-search-plugin/server';
import { AS_CODE_DATA_VIEW_SPEC_TYPE } from '@kbn/as-code-data-views-schema';
import type { DiscoverSessionInternalData } from '../internal_schema';
import { serializeEsqlControls } from '../../../common/session/control_panels';
import { getVisContextRequestData } from '../../../common/session/get_vis_context_request_data';
import { toStoredSearchAndTableAttributes } from '../../../common/session/search_and_table_mapping';
import { toStoredSessionSettings } from '../../../common/session/session_tab_mapping';
import { toStoredTabTypeState } from '../../../common/session/tab_type_state';
import { fromApiVisContext } from '../../../common/session/vis_context';

interface StoredSessionTabWithReferences {
  tab: DiscoverSessionAttributes['tabs'][number];
  references: SavedObjectReference[];
}

/** Assembles saved attributes and references from a validated API session without persisting it. */
export const transformDiscoverSessionIn = (data: DiscoverSessionApiData): StoredDiscoverSession => {
  const storedTabs = data.tabs.map((tab) => toStoredSessionTab(tab));

  return assembleStoredSession(data, storedTabs);
};

/** Preserves inline Data View IDs and uses them in the stored chart fingerprint. */
export const transformInternalDiscoverSessionIn = (
  data: DiscoverSessionInternalData
): StoredDiscoverSession => {
  const storedTabs = data.tabs.map((tab) => {
    const { data_source: dataSource } = tab;
    let inlineDataViewId: string | undefined;

    if (dataSource.type === AS_CODE_DATA_VIEW_SPEC_TYPE) {
      inlineDataViewId = dataSource.id;
    }

    return toStoredSessionTab(tab, inlineDataViewId);
  });

  return assembleStoredSession(data, storedTabs);
};

/** Converts an API tab to saved attributes and references, including its chart and controls. */
const toStoredSessionTab = (
  tab: DiscoverSessionApiTab,
  inlineDataViewId?: string
): StoredSessionTabWithReferences => {
  const { attributes, references } = toStoredSearchAndTableAttributes(tab, {
    refNamePrefix: `tab_${tab.id}`,
  });
  const tabTypeState = toStoredTabTypeState(tab);

  return {
    tab: {
      id: tab.id,
      label: tab.label,
      attributes: {
        ...attributes,
        ...toStoredSessionSettings(tab),
        visContext: fromApiVisContext(
          tab.vis_context,
          getVisContextRequestData(tab, inlineDataViewId)
        ),
        controlGroupJson: serializeEsqlControls(tab.control_panels),
        ...(tabTypeState !== undefined && { tabTypeState }),
      },
    },
    references,
  };
};

/** Combines the converted tabs with session metadata, placing tag references before tab references. */
const assembleStoredSession = (
  { title, description, tags }: Pick<DiscoverSessionApiData, 'title' | 'description' | 'tags'>,
  storedTabs: StoredSessionTabWithReferences[]
): StoredDiscoverSession => {
  const { references: tagReferences } = toStoredTags({ tags });

  return {
    attributes: { title, description, tabs: storedTabs.map(({ tab }) => tab) },
    references: [...tagReferences, ...storedTabs.flatMap(({ references }) => references)],
  };
};
