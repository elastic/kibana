/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */
import { i18n } from '@kbn/i18n';

export const CONNECTOR_ID = '.microsoft_defender_endpoint';
export const CONNECTOR_NAME = i18n.translate('connectors.msDefenderEndpoint.title', {
  defaultMessage: 'Microsoft Defender for Endpoint',
});

export enum SUB_ACTION {
  TEST_CONNECTOR = 'testConnector',
  GET_AGENT_DETAILS = 'getAgentDetails',
  GET_AGENT_LIST = 'getAgentList',
  ISOLATE_HOST = 'isolateHost',
  RELEASE_HOST = 'releaseHost',
  GET_ACTIONS = 'getActions',
  GET_LIBRARY_FILES = 'getLibraryFiles',
  RUN_SCRIPT = 'runScript',
  GET_ACTION_RESULTS = 'getActionResults',
  CANCEL_ACTION = 'cancelAction',
}
