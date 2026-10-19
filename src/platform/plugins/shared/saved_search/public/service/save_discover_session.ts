/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { SavedObjectsTaggingApi } from '@kbn/saved-objects-tagging-oss-plugin/public';
import type { ContentManagementPublicStart } from '@kbn/content-management-plugin/public';
import type { Reference } from '@kbn/content-management-utils';
import { SAVED_SEARCH_TYPE } from './constants';
import type { SavedSearchCrudTypes } from '../../common/content_management';
import type { DiscoverSession } from '../../common';
import { serializeDiscoverSession } from '../../common/service/discover_session_serialization';
import type { DiscoverSessionAttributes } from '../../server';

export type SaveDiscoverSessionParams = Pick<
  DiscoverSession,
  'title' | 'description' | 'tabs' | 'tags'
> &
  Partial<Pick<DiscoverSession, 'id'>>;

export interface SaveDiscoverSessionOptions {
  copyOnSave?: boolean;
}

const saveDiscoverSessionSavedObject = async (
  id: string | undefined,
  attributes: DiscoverSessionAttributes,
  references: Reference[] | undefined,
  contentManagement: ContentManagementPublicStart['client']
) => {
  const resp = id
    ? await contentManagement.update<
        SavedSearchCrudTypes['UpdateIn'],
        SavedSearchCrudTypes['UpdateOut']
      >({
        contentTypeId: SAVED_SEARCH_TYPE,
        id,
        data: attributes,
        options: {
          references,
        },
      })
    : await contentManagement.create<
        SavedSearchCrudTypes['CreateIn'],
        SavedSearchCrudTypes['CreateOut']
      >({
        contentTypeId: SAVED_SEARCH_TYPE,
        data: attributes,
        options: {
          references,
        },
      });

  return resp.item.id;
};

export const saveDiscoverSession = async (
  discoverSession: SaveDiscoverSessionParams,
  options: SaveDiscoverSessionOptions,
  contentManagement: ContentManagementPublicStart['client'],
  savedObjectsTagging: SavedObjectsTaggingApi | undefined
): Promise<DiscoverSession | undefined> => {
  const isNew = options.copyOnSave || !discoverSession.id;
  const { attributes, references: tabReferences } = serializeDiscoverSession(discoverSession);

  const references = savedObjectsTagging
    ? savedObjectsTagging.ui.updateTagsReferences(tabReferences, discoverSession.tags ?? [])
    : tabReferences;

  const id = await saveDiscoverSessionSavedObject(
    isNew ? undefined : discoverSession.id,
    attributes,
    references,
    contentManagement
  );

  return { ...discoverSession, id, references, managed: false };
};
