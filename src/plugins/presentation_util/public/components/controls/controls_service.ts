/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { EmbeddableFactory } from '../../../../embeddable/public';
import {
  ControlTypeRegistry,
  InputControlEmbeddable,
  InputControlFactory,
  InputControlInput,
  InputControlOutput,
} from './types';

export class ControlsService {
  private controlsFactoriesMap: ControlTypeRegistry = {};

  public registerInputControlType = (factory: InputControlFactory) => {
    this.controlsFactoriesMap[factory.type] = factory;
  };

  public getControlFactory = <
    I extends InputControlInput = InputControlInput,
    O extends InputControlOutput = InputControlOutput,
    E extends InputControlEmbeddable<I, O> = InputControlEmbeddable<I, O>
  >(
    type: string
  ) => {
    return this.controlsFactoriesMap[type] as EmbeddableFactory<I, O, E>;
  };

  public getInputControlTypes = () => Object.keys(this.controlsFactoriesMap);
}
