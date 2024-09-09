/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { pick } from 'lodash';

import type { KibanaPluginServiceFactory } from '@kbn/presentation-util-plugin/public';

import type { DashboardStartDependencies } from '../../plugin';
import type { DashboardEmbeddableService } from './types';

export type EmbeddableServiceFactory = KibanaPluginServiceFactory<
  DashboardEmbeddableService,
  DashboardStartDependencies
>;
export const embeddableServiceFactory: EmbeddableServiceFactory = ({ startPlugins }) => {
  const { embeddable } = startPlugins;

  return pick(embeddable, [
    'reactEmbeddableRegistryHasKey',
    'getEmbeddableFactory',
    'getEmbeddableFactories',
    'getStateTransfer',
    'getAllMigrations',
    'telemetry',
    'extract',
    'inject',
  ]);
};
