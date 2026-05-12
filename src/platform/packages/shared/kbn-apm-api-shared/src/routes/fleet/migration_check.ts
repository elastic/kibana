/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */
import type { PackagePolicy } from '@kbn/fleet-plugin/common';
import { defineRoute } from '../types';

export interface RunMigrationCheckResponse {
  has_cloud_agent_policy: boolean;
  has_cloud_apm_package_policy: boolean;
  cloud_apm_migration_enabled: boolean;
  has_required_role: boolean | undefined;
  cloud_apm_package_policy: PackagePolicy | undefined;
  has_apm_integrations: boolean;
  latest_apm_package_version: string;
}

export const migrationCheckRoute = defineRoute<RunMigrationCheckResponse>()({
  endpoint: 'GET /internal/apm/fleet/migration_check',
});
