/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { filter, type Subscription, take } from 'rxjs';
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
    this.logger = this.deps.logger.get('AvailabilityUpdater');
    this.listen().catch((error) => {
      this.logger.error('Failed to listen for availability updates', { error });
    });
  }

  private async listen(): Promise<void> {
    if (!this.deps.config.available) {
      await this.runConfigUnavailableDisable();
      return;
    }
    this.licenseSubscription = this.deps.licensing.license$
      .pipe(
        filter((license) => license.isAvailable && !isLicenseValid(license)),
        take(1)
      )
      .subscribe(async () => {
        await this.runLicenseDowngradeDisable();
        this.stop();
      });
  }

  public stop(): void {
    this.licenseSubscription?.unsubscribe();
    this.licenseSubscription = undefined;
  }

  private async runConfigUnavailableDisable(): Promise<void> {
    try {
      const { disabled, failures } = await this.deps.api.disableAllWorkflows();
      if (disabled > 0) {
        this.logger.info(`Workflows is not available. Disabled ${disabled} active workflows`);
      }
      if (failures.length > 0) {
        this.logger.error(
          `Workflows is not available. Failed to disable ${failures.length} active workflows`,
          { error: new Error(failures.map((f) => f.error).join(', ')) }
        );
      }
    } catch (error) {
      this.logger.error('Failed to disable workflows on workflows not available', {
        error,
      });
    }
  }

  private async runLicenseDowngradeDisable(): Promise<void> {
    try {
      const { disabled, failures } = await this.deps.api.disableAllWorkflows();
      if (disabled > 0) {
        this.logger.info(
          `License no longer supports Workflows (${REQUIRED_LICENSE_TYPE}). Disabled ${disabled} active workflows`
        );
      }
      if (failures.length > 0) {
        this.logger.error(
          `License no longer supports Workflows (${REQUIRED_LICENSE_TYPE}). Failed to disable ${failures.length} active workflows`,
          { error: new Error(failures.map((f) => f.error).join(', ')) }
        );
      }
    } catch (error) {
      this.logger.error('Failed to disable workflows on license downgrade.', { error });
    }
  }
}
