/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { ControlEmbeddable, ControlFactory, ControlInput, ControlOutput } from '../..';
import { EmbeddableFactory } from '../../../../embeddable/public';
import { PluginServiceFactory } from '../../../../presentation_util/public';
import { ControlsService, ControlTypeRegistry } from '../controls';

export type ControlsServiceFactory = PluginServiceFactory<ControlsService>;
export const controlsServiceFactory = () => getStubControlsService();

export const getStubControlsService = () => {
  const controlsFactoriesMap: ControlTypeRegistry = {};

  const registerControlType = (factory: ControlFactory) => {
    controlsFactoriesMap[factory.type] = factory;
  };

  const getControlFactory = <
    I extends ControlInput = ControlInput,
    O extends ControlOutput = ControlOutput,
    E extends ControlEmbeddable<I, O> = ControlEmbeddable<I, O>
  >(
    type: string
  ) => {
    return controlsFactoriesMap[type] as EmbeddableFactory<I, O, E>;
  };

  const getControlTypes = () => Object.keys(controlsFactoriesMap);

  return {
    registerControlType,
    getControlFactory,
    getControlTypes,
  };
};
