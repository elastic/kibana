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
} from '@kbn/embeddable-plugin/common';
import { SavedObjectReference } from '@kbn/core/types';
import { TimeSliderControlEmbeddableInput } from './types';

type TimeSliderInputWithType = Partial<TimeSliderControlEmbeddableInput> & { type: string };

export const createTimeSliderInject = (): EmbeddablePersistableStateService['inject'] => {
  return (state: EmbeddableStateWithType, references: SavedObjectReference[]) => {
    const workingState = { ...state } as EmbeddableStateWithType | TimeSliderInputWithType;
    return workingState as EmbeddableStateWithType;
  };
};

export const createTimeSliderExtract = (): EmbeddablePersistableStateService['extract'] => {
  return (state: EmbeddableStateWithType) => {
    const workingState = { ...state } as EmbeddableStateWithType | TimeSliderInputWithType;
    const references: SavedObjectReference[] = [];

    return { state: workingState as EmbeddableStateWithType, references };
  };
};
