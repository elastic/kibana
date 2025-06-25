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
    return isPanelRef(ref) ? transformPanelRef(ref) : ref;
  });
}

const PANEL_REF_NAME_PREFIX = 'panel_';

function isPanelRef(ref: SavedObjectReference) {
  return ref.name.includes(PANEL_REF_NAME_PREFIX);
}

function transformPanelRef(ref: SavedObjectReference) {
  const split = ref.name.split(PANEL_REF_NAME_PREFIX);
  const panelId = split.length >= 2 ? split[1] : undefined;
  return {
    ...ref,
    name: panelId ? `${panelId}:savedObjectRef` : 'savedObjectRef',
  };
}