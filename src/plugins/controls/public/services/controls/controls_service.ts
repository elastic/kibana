/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { EmbeddableFactory } from '@kbn/embeddable-plugin/public';
import { PluginServiceFactory } from '@kbn/presentation-util-plugin/public';
import { ControlsServiceType, ControlTypeRegistry } from './types';
import { ControlEmbeddable, ControlFactory, ControlInput, ControlOutput } from '../../types';

export type ControlsServiceFactory = PluginServiceFactory<ControlsServiceType>;
export const controlsServiceFactory = () => controlsService;

const controlsFactoriesMap: ControlTypeRegistry = {};

// export controls service directly for use in plugin setup lifecycle
export const controlsService: ControlsServiceType = {
  registerControlType: (factory: ControlFactory) => {
    controlsFactoriesMap[factory.type] = factory;
  },
  getControlFactory: <
    I extends ControlInput = ControlInput,
    O extends ControlOutput = ControlOutput,
    E extends ControlEmbeddable<I, O> = ControlEmbeddable<I, O>
  >(
    type: string
  ) => {
    return controlsFactoriesMap[type] as EmbeddableFactory<I, O, E>;
  },
  getControlTypes: () => Object.keys(controlsFactoriesMap),
};
