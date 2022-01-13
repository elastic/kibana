/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { ControlEmbeddable, ControlFactory, ControlInput, ControlOutput } from '.';
import { EmbeddableFactory } from '../../embeddable/public';
import { ControlTypeRegistry } from './services/controls';

export class ControlsService {
  private controlsFactoriesMap: ControlTypeRegistry = {};

  public registerControlType = (factory: ControlFactory) => {
    this.controlsFactoriesMap[factory.type] = factory;
  };

  public getControlFactory = <
    I extends ControlInput = ControlInput,
    O extends ControlOutput = ControlOutput,
    E extends ControlEmbeddable<I, O> = ControlEmbeddable<I, O>
  >(
    type: string
  ) => {
    return this.controlsFactoriesMap[type] as EmbeddableFactory<I, O, E>;
  };

  public getControlTypes = () => Object.keys(this.controlsFactoriesMap);
}
