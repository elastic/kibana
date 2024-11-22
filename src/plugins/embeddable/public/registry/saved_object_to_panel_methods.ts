/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { SavedObjectCommon } from '@kbn/saved-objects-finder-plugin/common';

type SavedObjectToPanelMethod<TSavedObjectAttributes, TByValueInput> = (
  // @ts-expect-error upgrade typescript v4.9.5
  savedObject: SavedObjectCommon<TSavedObjectAttributes>
) => { savedObjectId: string } | Partial<TByValueInput>;

export const savedObjectToPanel: Record<string, SavedObjectToPanelMethod<any, any>> = {};

/**
 * @deprecated
 * React embeddables should register their saved object types with the registerReactEmbeddableSavedObject registry.
 */
export const registerSavedObjectToPanelMethod = <TSavedObjectAttributes, TByValueAttributes>(
  savedObjectType: string,
  method: SavedObjectToPanelMethod<TSavedObjectAttributes, TByValueAttributes>
) => {
  savedObjectToPanel[savedObjectType] = method;
};
