/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { Subscription } from 'rxjs';
import type { Logger } from '@kbn/core/server';
import type { LicensingPluginStart } from '@kbn/licensing-plugin/server';
import { isLicenseValid, REQUIRED_LICENSE_TYPE } from './is_license_valid';
import type { WorkflowsManagementApi } from '../api/workflows_management_api';
import type { WorkflowsManagementConfig } from '../config';

export interface AvailabilityUpdaterDeps {
  licensing: LicensingPluginStart;
  config: WorkflowsManagementConfig;
  api: WorkflowsManagementApi;
  logger: Logger;
}

/**
 * Disables and unschedule workflows when the instance is not workflows-available:
 * - `workflowsManagement.available` is false at startup (serverless config).
 * - License transitions from workflows-valid to workflows-invalid (e.g. downgrade below enterprise).
 */
export class AvailabilityUpdater {
  private logger: Logger;
  private licenseSubscription?: Subscription;

  constructor(private readonly deps: AvailabilityUpdaterDeps) {
    this.logger = this.deps.logger.get('[AvailabilityUpdater]');
    this.listen().catch((error) => {
      this.logger.error('Failed to listen for availability updates', { error });
    });
  }

  private async listen(): Promise<void> {
    if (!this.deps.config.available) {
      await this.runConfigUnavailableDisable();
      return;
    }

    this.licenseSubscription = this.deps.licensing.license$.subscribe(async (license) => {
      if (license.isAvailable && !isLicenseValid(license)) {
        await this.runLicenseDowngradeDisable();
        this.stop();
      }
    });
  }

  public stop(): void {
    this.licenseSubscription?.unsubscribe();
    this.licenseSubscription = undefined;
  }

  private async runConfigUnavailableDisable(): Promise<void> {
    try {
      await this.deps.api.disableAllWorkflows();
      this.logger.info('Disabled all workflows because workflowsManagement.available is false');
    } catch (error) {
      this.logger.error(
        'Failed to disable all workflows when workflowsManagement.available is false',
        { error }
      );
    }
  }

  private async runLicenseDowngradeDisable(): Promise<void> {
    try {
      await this.deps.api.disableAllWorkflows();
      this.logger.info(
        `Disabled all workflows due to license no longer supporting Workflows (${REQUIRED_LICENSE_TYPE} required)`
      );
    } catch (error) {
      this.logger.error('Failed to disable all workflows on license downgrade.', { error });
    }
  }
}
