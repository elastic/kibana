/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { toStoredTags } from '@kbn/as-code-shared-transforms';
import type { SavedObjectReference } from '@kbn/core/server';
import type { DiscoverSessionAttributes } from '@kbn/saved-search-plugin/server';
import type { DiscoverSessionApiData } from '@kbn/as-code-discover-schema';
import { serializeEsqlControls } from '../../../common/session/control_panels';
import { getVisContextRequestData } from '../../../common/session/get_vis_context_request_data';
import { toStoredSearchAndTableAttributes } from '../../../common/session/search_and_table_mapping';
import { toStoredSessionSettings } from '../../../common/session/session_tab_mapping';
import { toStoredTabTypeState } from '../../../common/session/tab_type_state';
import { fromApiVisContext } from '../../../common/session/vis_context';

/** Assembles saved attributes and references from a validated API session without persisting it. */
export const transformDiscoverSessionIn = (
  data: DiscoverSessionApiData
): { attributes: DiscoverSessionAttributes; references: SavedObjectReference[] } => {
  const { references: tagReferences } = toStoredTags({ tags: data.tags });
  const references = [...tagReferences];
  const tabs: DiscoverSessionAttributes['tabs'] = data.tabs.map((tab) => {
    const { attributes: tabAttributes, references: tabReferences } =
      toStoredSearchAndTableAttributes(tab, { refNamePrefix: `tab_${tab.id}` });
    const tabTypeState = toStoredTabTypeState(tab);
    references.push(...tabReferences);

    return {
      id: tab.id,
      label: tab.label,
      attributes: {
        ...tabAttributes,
        ...toStoredSessionSettings(tab),
        visContext: fromApiVisContext(tab.vis_context, getVisContextRequestData(tab)),
        controlGroupJson: serializeEsqlControls(tab.control_panels),
        ...(tabTypeState !== undefined && { tabTypeState }),
      },
    };
  });

  return {
    attributes: { title: data.title, description: data.description, tabs },
    references,
  };
};
