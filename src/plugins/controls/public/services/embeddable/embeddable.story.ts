/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { PluginServiceFactory } from '@kbn/presentation-util-plugin/public';
import { embeddablePluginMock } from '@kbn/embeddable-plugin/public/mocks';
import { ControlsEmbeddableService } from './types';

export type EmbeddableServiceFactory = PluginServiceFactory<ControlsEmbeddableService>;
export const embeddableServiceFactory: EmbeddableServiceFactory = () => {
  const { doStart } = embeddablePluginMock.createInstance();
  const start = doStart();
  return { getEmbeddableFactory: start.getEmbeddableFactory };
};
