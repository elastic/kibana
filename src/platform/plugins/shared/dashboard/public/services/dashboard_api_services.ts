/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import {
  type DashboardBackupService,
  createDashboardBackupService,
} from './dashboard_backup_service';
import { spacesService } from './kibana_services';

let backupService: DashboardBackupService | undefined;
let servicesAvailablePromise: Promise<undefined> | undefined;

export const getDashboardBackupService = () => {
  if (!backupService)
    throw new Error(
      'Ensure initialize Dashboard app services is called before trying to access one of its services'
    );
  return backupService;
};

/**
 * Initializes Dashboard API service singletons if they haven't been initialized already.
 */
export const initializeDashboardApiServices = async () => {
  if (backupService) return;
  if (servicesAvailablePromise) return servicesAvailablePromise;
  servicesAvailablePromise = (async () => {
    backupService = await createDashboardBackupService(spacesService);
  })();
  return servicesAvailablePromise;
};
