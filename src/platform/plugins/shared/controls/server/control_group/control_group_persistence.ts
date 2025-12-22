/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { SerializableRecord } from '@kbn/utility-types';

const safeJSONParse = <OutType>(jsonString?: string): OutType | undefined => {
  if (!jsonString && typeof jsonString !== 'string') return;
  try {
    return JSON.parse(jsonString) as OutType;
  } catch {
    return;
  }
};

export const controlGroupSavedObjectStateToSerializableRuntimeState = (savedObjectState?: {
  panelsJSON: string;
}): SerializableRecord => {
  return {
    panels: safeJSONParse(savedObjectState?.panelsJSON) ?? {},
  };
};

export const serializableRuntimeStateToControlGroupSavedObjectState = (
  serializable: SerializableRecord // It is safe to treat this as SerializableControlGroupState
): SerializableRecord => {
  return {
    panelsJSON: JSON.stringify(serializable.panels),
  };
};
