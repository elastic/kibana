/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { EmbeddableFactory } from '@kbn/embeddable-plugin/public';
import { KibanaPluginServiceFactory } from '@kbn/presentation-util-plugin/public';
import { ControlEmbeddable, ControlFactory, ControlInput, ControlOutput } from '../..';
import { ControlsPluginStartDeps } from '../../types';
import { ControlsServiceType, ControlTypeRegistry } from './types';

export class ControlsService implements ControlsServiceType {
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

export type ControlsServiceFactory = KibanaPluginServiceFactory<
  ControlsServiceType,
  ControlsPluginStartDeps
>;

export const controlsServiceFactory: ControlsServiceFactory = (core) => {
  return new ControlsService();
};
