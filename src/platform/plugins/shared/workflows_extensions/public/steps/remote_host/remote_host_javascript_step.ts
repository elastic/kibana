/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { SshHostConnectorTypeId as SSH_HOST_CONNECTOR_ID } from '@kbn/connector-schemas';
import { remoteHostJavascriptStepCommonDefinition } from '../../../common/steps/remote_host';
import { createPublicStepDefinition } from '../../step_registry/types';

export const remoteHostJavascriptStepDefinition = createPublicStepDefinition({
  ...remoteHostJavascriptStepCommonDefinition,
  icon: React.lazy(() =>
    import('@elastic/eui/es/components/icon/assets/app_console').then(({ icon }) => ({
      default: icon,
    }))
  ),
  editorHandlers: {
    config: {
      'connector-id': {
        connectorIdSelection: {
          connectorTypes: [SSH_HOST_CONNECTOR_ID],
          enableCreation: true,
        },
      },
    },
  },
  logs: {
    enabled: true,
    getLogs: async ({ logsApi }) => {
      const allLogs = await logsApi.fetchLogs();
      return allLogs
        .filter((log) => {
          const tags = log.additionalData?.tags;
          return Array.isArray(tags) && tags.includes('remote_host_javascript');
        })
        .map(({ message, timestamp, level }) => ({
          message,
          timestamp,
          level: level === 'trace' || level === 'debug' ? undefined : level,
        }));
    },
  },
});
