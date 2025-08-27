/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { i18n } from '@kbn/i18n';
import { ExecutionStatus } from '@kbn/workflows';

export const STATUS_LABELS = {
  [ExecutionStatus.PENDING]: i18n.translate('workflowsManagement.executionStatus.pending', {
    defaultMessage: 'Pending',
  }),
  [ExecutionStatus.WAITING]: i18n.translate('workflowsManagement.executionStatus.waiting', {
    defaultMessage: 'Waiting',
  }),
  [ExecutionStatus.WAITING_FOR_INPUT]: i18n.translate(
    'workflowsManagement.executionStatus.waitingForInput',
    {
      defaultMessage: 'Waiting for input',
    }
  ),
  [ExecutionStatus.RUNNING]: i18n.translate('workflowsManagement.executionStatus.running', {
    defaultMessage: 'Running',
  }),
  [ExecutionStatus.COMPLETED]: i18n.translate('workflowsManagement.executionStatus.completed', {
    defaultMessage: 'Completed',
  }),
  [ExecutionStatus.FAILED]: i18n.translate('workflowsManagement.executionStatus.failed', {
    defaultMessage: 'Failed',
  }),
  [ExecutionStatus.CANCELLED]: i18n.translate('workflowsManagement.executionStatus.cancelled', {
    defaultMessage: 'Cancelled',
  }),
  [ExecutionStatus.SKIPPED]: i18n.translate('workflowsManagement.executionStatus.skipped', {
    defaultMessage: 'Skipped',
  }),
};

/**
 * Gets the localized label for a given execution status
 */
export function getStatusLabel(status: ExecutionStatus): string {
  return STATUS_LABELS[status];
}
