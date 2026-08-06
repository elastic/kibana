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
import type { ActionTypeModel as ConnectorTypeModel } from '@kbn/triggers-actions-ui-plugin/public';

export const CONNECTOR_ID = '.ssh-host';

export const getConnectorType = (): ConnectorTypeModel => ({
  id: CONNECTOR_ID,
  iconClass: 'consoleApp',
  actionTypeTitle: i18n.translate('workflowsExtensions.sshHostConnector.actionTypeTitle', {
    defaultMessage: 'SSH Host',
  }),
  selectMessage: i18n.translate('workflowsExtensions.sshHostConnector.selectMessage', {
    defaultMessage: 'Run scripts on any SSH-accessible host (Linux or macOS).',
  }),
  validateParams: async (actionParams) => {
    const errors: Record<string, string[]> = {};
    if (!actionParams?.subActionParams?.script?.trim()) {
      errors.script = [
        i18n.translate('workflowsExtensions.sshHostConnector.params.script.requiredError', {
          defaultMessage: 'Bash script is required.',
        }),
      ];
    }
    return { errors };
  },
  actionConnectorFields: lazy(() => import('./ssh_host_connector_fields')),
  actionParamsFields: lazy(() => import('./ssh_host_params')),
});
