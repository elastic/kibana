/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { KibanaPluginServiceFactory } from '@kbn/presentation-util-plugin/public';
import { DashboardStartDependencies } from '../../plugin';
import { DashboardSavedObjectsManagementService } from './types';

export type SavedObjectsManagementServiceFactory = KibanaPluginServiceFactory<
  DashboardSavedObjectsManagementService,
  DashboardStartDependencies
>;

export const savedObjectsManagementServiceFactory: SavedObjectsManagementServiceFactory = ({
  startPlugins,
}) => {
  const { savedObjectsManagement } = startPlugins;

  const { parseQuery, getTagFindReferences } = savedObjectsManagement;

  return {
    parseQuery,
    getTagFindReferences,
  };
};
