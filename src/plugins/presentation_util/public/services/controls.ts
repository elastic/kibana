/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { Filter } from '@kbn/es-query';
import { Query, TimeRange } from '../../../data/public';
import {
  EmbeddableFactory,
  EmbeddableInput,
  EmbeddableOutput,
  IEmbeddable,
} from '../../../embeddable/public';

/**
 * Control embeddable types
 */
export type InputControlFactory = EmbeddableFactory<
  InputControlInput,
  InputControlOutput,
  InputControlEmbeddable
>;

export type InputControlInput = EmbeddableInput & {
  query?: Query;
  filters?: Filter[];
  timeRange?: TimeRange;
  twoLineLayout?: boolean;
};

export type InputControlOutput = EmbeddableOutput & {
  filters?: Filter[];
};

export type InputControlEmbeddable<
  TInputControlEmbeddableInput extends InputControlInput = InputControlInput,
  TInputControlEmbeddableOutput extends InputControlOutput = InputControlOutput
> = IEmbeddable<TInputControlEmbeddableInput, TInputControlEmbeddableOutput>;

export interface ControlTypeRegistry {
  [key: string]: InputControlFactory;
}

export interface PresentationControlsService {
  registerInputControlType: (factory: InputControlFactory) => void;

  getControlFactory: <
    I extends InputControlInput = InputControlInput,
    O extends InputControlOutput = InputControlOutput,
    E extends InputControlEmbeddable<I, O> = InputControlEmbeddable<I, O>
  >(
    type: string
  ) => EmbeddableFactory<I, O, E>;

  getInputControlTypes: () => string[];
}

export const getCommonControlsService = () => {
  const controlsFactoriesMap: ControlTypeRegistry = {};

  const registerInputControlType = (factory: InputControlFactory) => {
    controlsFactoriesMap[factory.type] = factory;
  };

  const getControlFactory = <
    I extends InputControlInput = InputControlInput,
    O extends InputControlOutput = InputControlOutput,
    E extends InputControlEmbeddable<I, O> = InputControlEmbeddable<I, O>
  >(
    type: string
  ) => {
    return controlsFactoriesMap[type] as EmbeddableFactory<I, O, E>;
  };

  const getInputControlTypes = () => Object.keys(controlsFactoriesMap);

  return {
    registerInputControlType,
    getControlFactory,
    getInputControlTypes,
  };
};
