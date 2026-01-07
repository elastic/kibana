/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { SavedObjectReference } from '@kbn/core/types';
import { DATA_VIEW_SAVED_OBJECT_TYPE } from '@kbn/data-views-plugin/common';
import type { OptionsListDSLControlState } from '@kbn/controls-schemas';
import type { SerializableRecord, Writable } from '@kbn/utility-types';
import type { PersistableStateDefinition } from '@kbn/kibana-utils-plugin/common';

const dataViewReferenceName = 'optionsListDataView';

export const optionsListPersistableState: PersistableStateDefinition = {
  inject: (state: SerializableRecord, references: SavedObjectReference[]) => {
    const workingState = { ...state };
    references.forEach((reference) => {
      if (reference.name === dataViewReferenceName) {
        (workingState as Writable<Partial<OptionsListDSLControlState>>).dataViewId = reference.id;
      }
    });
    return workingState;
  },
  extract: (state: SerializableRecord) => {
    const workingState = { ...state };
    const references: SavedObjectReference[] = [];

    if ('dataViewId' in workingState) {
      references.push({
        name: dataViewReferenceName,
        type: DATA_VIEW_SAVED_OBJECT_TYPE,
        id: (workingState as Partial<OptionsListDSLControlState>).dataViewId!,
      });
      delete workingState.dataViewId;
    }
    return { state: workingState, references };
  },
};
