/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { CoreSetup, Logger } from '@kbn/core/server';
import { WorkflowManagementAuditLog } from './routes/utils/workflow_audit_logging';
import { WorkflowsManagementApi } from './workflows_management_api';
import type { WorkflowsServiceOptions } from './workflows_management_service';
import { WorkflowsService } from './workflows_management_service';
import type { WorkflowsServerPluginSetupDeps, WorkflowsServerPluginStartDeps } from '../types';

/**
 * Builds the workflows service and the management API on top of it. The plugin (Kibana) and the
 * tasks entry (task pods) both call this: the same classes run in both, only what feeds them
 * differs (`options.readOnly` makes the service use what Kibana installed and create nothing).
 */
export const createWorkflowsManagement = ({
  core,
  plugins,
  logger,
  kibanaVersion,
  available,
  options,
}: {
  core: CoreSetup<WorkflowsServerPluginStartDeps>;
  plugins: WorkflowsServerPluginSetupDeps;
  logger: Logger;
  kibanaVersion: string;
  available: boolean;
  options?: WorkflowsServiceOptions;
}) => {
  const workflowsService = new WorkflowsService(core, plugins, logger, kibanaVersion, options);
  const api = new WorkflowsManagementApi(workflowsService, available, logger);
  const audit = new WorkflowManagementAuditLog({ service: workflowsService });
  api.setAuditLog(audit);
  return { workflowsService, api, audit };
};
