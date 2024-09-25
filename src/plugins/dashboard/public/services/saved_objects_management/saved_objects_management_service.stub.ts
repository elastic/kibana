/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { PluginServiceFactory } from '@kbn/presentation-util-plugin/public';
import { SavedObjectsManagementPluginStart } from '@kbn/saved-objects-management-plugin/public';
import { savedObjectsManagementPluginMock } from '@kbn/saved-objects-management-plugin/public/mocks';

type SavedObjectsManagementServiceFactory = PluginServiceFactory<SavedObjectsManagementPluginStart>;

export const savedObjectsManagementServiceFactory: SavedObjectsManagementServiceFactory = () => {
  return savedObjectsManagementPluginMock.createStartContract();
};
