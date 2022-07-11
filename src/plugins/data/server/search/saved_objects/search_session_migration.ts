/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { SavedObjectMigrationMap, SavedObjectUnsanitizedDoc } from '@kbn/core/server';
import {
  SearchSessionSavedObjectAttributes as SearchSessionSavedObjectAttributesLatest,
  SearchSessionStatus,
} from '../../../common';

/**
 * Search sessions were released in 7.12.0
 * In 7.13.0 a `completed` field was added.
 * It is a timestamp representing the session was transitioned into "completed" status.
 */
export type SearchSessionSavedObjectAttributesPre$7$13$0 = Omit<
  SearchSessionSavedObjectAttributesPre$7$14$0,
  'completed'
>;

/**
 * In 7.14.0 a `version` field was added. When search session is created it is populated with current kibana version.
 * It is used to display warnings when trying to restore a session from a different version
 * For saved object created before 7.14.0 we populate "7.13.0" inside the migration.
 * It is less then ideal because the saved object could have actually been created in "7.12.x" or "7.13.x",
 * but what is important for 7.14.0 is that the version is less then "7.14.0"
 */
export type SearchSessionSavedObjectAttributesPre$7$14$0 = Omit<
  SearchSessionSavedObjectAttributesPre$8$0$0,
  'version'
>;

/**
 * In 8.0.0, we migrated from using URL generators to the locators service. As a result, we move
 * from using `urlGeneratorId` to `locatorId`.
 */
export type SearchSessionSavedObjectAttributesPre$8$0$0 = Omit<
  SearchSessionSavedObjectAttributesLatest,
  'locatorId'
> & {
  urlGeneratorId?: string;
};

function getLocatorId(urlGeneratorId?: string) {
  if (!urlGeneratorId) return;
  if (urlGeneratorId === 'DISCOVER_APP_URL_GENERATOR') return 'DISCOVER_APP_LOCATOR';
  if (urlGeneratorId === 'DASHBOARD_APP_URL_GENERATOR') return 'DASHBOARD_APP_LOCATOR';
  throw new Error(`No migration found for search session URL generator ${urlGeneratorId}`);
}

export const searchSessionSavedObjectMigrations: SavedObjectMigrationMap = {
  '7.13.0': (
    doc: SavedObjectUnsanitizedDoc<SearchSessionSavedObjectAttributesPre$7$13$0>
  ): SavedObjectUnsanitizedDoc<SearchSessionSavedObjectAttributesPre$7$14$0> => {
    if (doc.attributes.status === SearchSessionStatus.COMPLETE) {
      return {
        ...doc,
        attributes: {
          ...doc.attributes,
          completed: doc.attributes.touched,
        },
      };
    }

    return doc;
  },
  '7.14.0': (
    doc: SavedObjectUnsanitizedDoc<SearchSessionSavedObjectAttributesPre$7$14$0>
  ): SavedObjectUnsanitizedDoc<SearchSessionSavedObjectAttributesLatest> => {
    return {
      ...doc,
      attributes: {
        ...doc.attributes,
        version: '7.13.0',
      },
    };
  },
  '8.0.0': (
    doc: SavedObjectUnsanitizedDoc<SearchSessionSavedObjectAttributesPre$8$0$0>
  ): SavedObjectUnsanitizedDoc<SearchSessionSavedObjectAttributesLatest> => {
    const {
      attributes: { urlGeneratorId, ...otherAttrs },
    } = doc;
    const locatorId = getLocatorId(urlGeneratorId);
    const attributes = { ...otherAttrs, locatorId };
    return { ...doc, attributes };
  },
};
