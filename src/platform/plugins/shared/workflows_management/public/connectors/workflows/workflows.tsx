/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { lazy } from 'react';
import { i18n } from '@kbn/i18n';
import type {
  ActionTypeModel as ConnectorTypeModel,
  GenericValidationResult,
} from '@kbn/triggers-actions-ui-plugin/public';
import type { WorkflowsActionParams, WorkflowsConfig, WorkflowsSecrets } from './types';

export function getConnectorType(): ConnectorTypeModel<
  WorkflowsConfig,
  WorkflowsSecrets,
  WorkflowsActionParams
> {
  return {
    id: '.workflows',
    iconClass: 'workflowsApp',
    selectMessage: i18n.translate('xpack.stackConnectors.components.workflows.selectMessageText', {
      defaultMessage: 'Execute workflows when alerts are triggered.',
    }),
    actionTypeTitle: i18n.translate(
      'xpack.stackConnectors.components.workflows.connectorTypeTitle',
      {
        defaultMessage: 'Workflows',
      }
    ),
    validateParams: async (
      actionParams: WorkflowsActionParams
    ): Promise<GenericValidationResult<unknown>> => {
      const translations = await import('./translations');
      const errors = {
        'subActionParams.workflowId': [] as string[],
      };
      const validationResult = { errors };
      const workflowId = actionParams.subActionParams?.workflowId?.trim();
      if (!workflowId || workflowId.length === 0) {
        errors['subActionParams.workflowId'].push(translations.WORKFLOW_ID_REQUIRED);
      }
      return validationResult;
    },
    actionConnectorFields: lazy(() => import('./workflows_connectors')),
    actionParamsFields: lazy(() => import('./workflows_params')),
    isSystemActionType: true,
  };
}
