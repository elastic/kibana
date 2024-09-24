/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { PluginServiceFactory } from '@kbn/presentation-util-plugin/public';
import { DashboardBackupServiceType } from './types';

type DashboardBackupServiceFactory = PluginServiceFactory<DashboardBackupServiceType>;

export const dashboardBackupServiceFactory: DashboardBackupServiceFactory = () => {
  return {
    clearState: jest.fn(),
    getState: jest.fn().mockReturnValue(undefined),
    setState: jest.fn(),
    getViewMode: jest.fn(),
    storeViewMode: jest.fn(),
    getDashboardIdsWithUnsavedChanges: jest
      .fn()
      .mockReturnValue(['dashboardUnsavedOne', 'dashboardUnsavedTwo']),
    dashboardHasUnsavedEdits: jest.fn(),
  };
};
