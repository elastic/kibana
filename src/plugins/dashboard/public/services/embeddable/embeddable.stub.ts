/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { embeddablePluginMock } from '@kbn/embeddable-plugin/public/mocks';
import type { PluginServiceFactory } from '@kbn/presentation-util-plugin/public';
import type { DashboardEmbeddableService } from './types';

export type EmbeddableServiceFactory = PluginServiceFactory<DashboardEmbeddableService>;

export const embeddableServiceFactory: EmbeddableServiceFactory = () => {
  const pluginMock = embeddablePluginMock.createStartContract();

  return {
    reactEmbeddableRegistryHasKey: pluginMock.reactEmbeddableRegistryHasKey,
    getEmbeddableFactories: pluginMock.getEmbeddableFactories,
    getEmbeddableFactory: pluginMock.getEmbeddableFactory,
    getStateTransfer: pluginMock.getStateTransfer,
    getAllMigrations: pluginMock.getAllMigrations,
    telemetry: pluginMock.telemetry,
    extract: pluginMock.extract,
    inject: pluginMock.inject,
  };
};
