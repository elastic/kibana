/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import {
  EmbeddableStateWithType,
  EmbeddablePersistableStateService,
} from '../../../../embeddable/common';
import { RangeSliderEmbeddableInput } from './types';
import { SavedObjectReference } from '../../../../../core/types';
import { DATA_VIEW_SAVED_OBJECT_TYPE } from '../../../../data_views/common';

type RangeSliderInputWithType = Partial<RangeSliderEmbeddableInput> & { type: string };
const dataViewReferenceName = 'optionsListDataView';

export const createRangeSliderInject = (): EmbeddablePersistableStateService['inject'] => {
  return (state: EmbeddableStateWithType, references: SavedObjectReference[]) => {
    const workingState = { ...state } as EmbeddableStateWithType | RangeSliderInputWithType;
    references.forEach((reference) => {
      if (reference.name === dataViewReferenceName) {
        (workingState as RangeSliderInputWithType).dataViewId = reference.id;
      }
    });
    return workingState as EmbeddableStateWithType;
  };
};

export const createRangeSliderExtract = (): EmbeddablePersistableStateService['extract'] => {
  return (state: EmbeddableStateWithType) => {
    const workingState = { ...state } as EmbeddableStateWithType | RangeSliderInputWithType;
    const references: SavedObjectReference[] = [];

    if ('dataViewId' in workingState) {
      references.push({
        name: dataViewReferenceName,
        type: DATA_VIEW_SAVED_OBJECT_TYPE,
        id: workingState.dataViewId!,
      });
      delete workingState.dataViewId;
    }
    return { state: workingState as EmbeddableStateWithType, references };
  };
};
