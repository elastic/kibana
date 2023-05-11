/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { KibanaPluginServiceFactory } from '@kbn/presentation-util-plugin/public';
import type { LensPublicStart } from '@kbn/lens-plugin/public';
import type { DashboardStartDependencies } from '../../plugin';

export type LensServiceFactory = KibanaPluginServiceFactory<
  LensPublicStart,
  DashboardStartDependencies
>;
export const lensServiceFactory: LensServiceFactory = ({ startPlugins }) => {
  const { lens } = startPlugins;
  return lens;
};
