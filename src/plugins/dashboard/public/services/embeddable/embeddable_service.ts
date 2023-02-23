/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
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
    'getEmbeddableFactory',
    'getEmbeddableFactories',
    'getStateTransfer',
    'EmbeddablePanel',
    'getAllMigrations',
    'telemetry',
    'extract',
    'inject',
  ]);
};
