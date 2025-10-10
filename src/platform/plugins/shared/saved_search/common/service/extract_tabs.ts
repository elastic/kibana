/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { v4 as uuidv4, v5 as uuidv5 } from 'uuid';
import type { SavedObjectModelDataBackfillFn } from '@kbn/core-saved-objects-server';
import type { TypeOf } from '@kbn/config-schema';
import { i18n } from '@kbn/i18n';
import { omit } from 'lodash';
import type {
  SCHEMA_SEARCH_MODEL_VERSION_5,
  SCHEMA_SEARCH_MODEL_VERSION_6,
} from '../../server/saved_objects/schema';

export const extractTabsBackfillFn: SavedObjectModelDataBackfillFn<
  TypeOf<typeof SCHEMA_SEARCH_MODEL_VERSION_5>,
  TypeOf<typeof SCHEMA_SEARCH_MODEL_VERSION_6>
> = (prevDoc) => {
  const attributes = extractTabs(prevDoc.attributes);
  return { attributes };
};

// Don't change this, it's used to generate deterministic UUIDs for
// the default tab when backfilling pre-tab to tabbed Discover sessions
const DEFAULT_TAB_UUID_NAMESPACE = '617f8ea7-754a-4a75-86bf-58c4b2f99690';

/**
 * Extract tab attributes into a separate array since multiple tabs are supported
 * @param attributes The previous attributes to be transformed (version 5)
 * @param discoverSessionId Optional Discover session ID used to generate a deterministic UUID for the default tab
 */
export function extractTabs<T extends TypeOf<typeof SCHEMA_SEARCH_MODEL_VERSION_5>>(
  attributes: T,
  discoverSessionId?: string
) {
  const { title, description, ...tabAttrs } = attributes;
  const id = discoverSessionId ? uuidv5(discoverSessionId, DEFAULT_TAB_UUID_NAMESPACE) : uuidv4();
  const tabs = [
    {
      id,
      label: i18n.translate('savedSearch.defaultTabLabel', {
        defaultMessage: 'Untitled',
      }),
      attributes: omit(tabAttrs, 'tabs'),
    },
  ];
  return { ...attributes, tabs };
}
