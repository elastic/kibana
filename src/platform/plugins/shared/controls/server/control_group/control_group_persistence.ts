/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { SerializableRecord } from '@kbn/utility-types';
import { DEFAULT_AUTO_APPLY_SELECTIONS } from '@kbn/controls-constants';

/**
 * @deprecated Backwards compatibility with pre-9.4.0 saved object migrations
 */
export const controlGroupSavedObjectStateToSerializableRuntimeState = (_: object) => {
  return {
    chainingSystem: 'HIERARCHICAL',
    labelPosition: 'oneLine',
    autoApplySelections: DEFAULT_AUTO_APPLY_SELECTIONS,
    ignoreParentSettings: {},
    panels: {},
  };
};

/**
 * @deprecated Backwards compatibility with pre-9.4.0 saved object migrations
 */
export const serializableRuntimeStateToControlGroupSavedObjectState = (
  serializable: SerializableRecord // It is safe to treat this as SerializableControlGroupState
) => {
  return {
    controlStyle: serializable.labelPosition,
    chainingSystem: serializable.chainingSystem,
    showApplySelections: !Boolean(serializable.autoApplySelections),
    ignoreParentSettingsJSON: JSON.stringify(serializable.ignoreParentSettings),
    panelsJSON: JSON.stringify(serializable.panels),
  };
};
