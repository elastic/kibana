/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { SavedObjectReference } from '@kbn/core/server';

export function transformReferencesOut(references: SavedObjectReference[]): SavedObjectReference[] {
  return references.map((ref) => {
    return isLegacySavedObjectRef(ref) ? transformLegacySavedObjectRef(ref) : ref;
  });
}

// < 9.2 legach saved object ref name shape `${panelId}:panel_${panelId}`
const LEGACY_SAVED_OBJECT_REF_NAME_PREFIX = 'panel_';

function isLegacySavedObjectRef(ref: SavedObjectReference) {
  return ref.name.includes(LEGACY_SAVED_OBJECT_REF_NAME_PREFIX);
}

function transformLegacySavedObjectRef(ref: SavedObjectReference) {
  const split = ref.name.split(LEGACY_SAVED_OBJECT_REF_NAME_PREFIX);
  const panelId = split.length >= 2 ? split[1] : undefined;
  return {
    ...ref,
    name: panelId ? `${panelId}:savedObjectRef` : 'savedObjectRef',
  };
}
