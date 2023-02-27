/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { KibanaPluginServiceFactory } from '@kbn/presentation-util-plugin/public';
import { SavedObjectsManagementPluginStart } from '@kbn/saved-objects-management-plugin/public';
import { DashboardStartDependencies } from '../../plugin';

export type SavedObjectsManagementServiceFactory = KibanaPluginServiceFactory<
  SavedObjectsManagementPluginStart,
  DashboardStartDependencies
>;

export const savedObjectsManagementServiceFactory: SavedObjectsManagementServiceFactory = ({
  startPlugins,
}) => {
  const { savedObjectsManagement } = startPlugins;

  return savedObjectsManagement;
};
