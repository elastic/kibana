/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */
import { i18n } from '@kbn/i18n';

export const CONNECTOR_NAME = i18n.translate('connectors.crowdStrike.title', {
  defaultMessage: 'CrowdStrike',
});
export const CONNECTOR_ID = '.crowdstrike';
export const API_MAX_RESULTS = 1000;

export enum SUB_ACTION {
  GET_AGENT_DETAILS = 'getAgentDetails',
  HOST_ACTIONS = 'hostActions',
  GET_AGENT_ONLINE_STATUS = 'getAgentOnlineStatus',
  EXECUTE_RTR_COMMAND = 'executeRTRCommand',
  EXECUTE_ACTIVE_RESPONDER_RTR = 'batchActiveResponderExecuteRTR',
  EXECUTE_ADMIN_RTR = 'batchAdminExecuteRTR',
  GET_RTR_CLOUD_SCRIPTS = 'getRTRCloudScripts',
}
