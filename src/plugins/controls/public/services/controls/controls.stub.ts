/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { PluginServiceFactory } from '@kbn/presentation-util-plugin/public';
import { ControlFactory, DefaultControlApi } from '../../react_controls/controls/types';
import { ControlsServiceType } from './types';

export type ControlsServiceFactory = PluginServiceFactory<ControlsServiceType>;
export const controlsServiceFactory = () => getStubControlsService();

export const getStubControlsService = () => {
  const controlsFactoriesMap: { [key: string]: ControlFactory<any, any> } = {};

  const registerControlFactory = (factory: ControlFactory<any, any>) => {
    controlsFactoriesMap[factory.type] = factory;
  };

  const getControlFactory = <
    State extends object = object,
    ApiType extends DefaultControlApi = DefaultControlApi
  >(
    type: string
  ) => {
    return controlsFactoriesMap[type] as ControlFactory<any, any>;
  };

  const getAllControlTypes = () => Object.keys(controlsFactoriesMap);

  return {
    registerControlFactory,
    getControlFactory,
    getAllControlTypes,
  };
};
