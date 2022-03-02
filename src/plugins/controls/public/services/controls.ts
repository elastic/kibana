/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { EmbeddableFactory } from '../../../embeddable/public';
import { ControlEmbeddable, ControlFactory, ControlOutput, ControlInput } from '../types';

export interface ControlTypeRegistry {
  [key: string]: ControlFactory;
}

export interface ControlsService {
  registerControlType: (factory: ControlFactory) => void;

  getControlFactory: <
    I extends ControlInput = ControlInput,
    O extends ControlOutput = ControlOutput,
    E extends ControlEmbeddable<I, O> = ControlEmbeddable<I, O>
  >(
    type: string
  ) => EmbeddableFactory<I, O, E>;

  getControlTypes: () => string[];
}
