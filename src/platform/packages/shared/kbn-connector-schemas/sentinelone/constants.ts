/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */
import { i18n } from '@kbn/i18n';

export const CONNECTOR_ID = '.sentinelone';
export const CONNECTOR_NAME = i18n.translate('connectors.sentinelone.title', {
  defaultMessage: 'Sentinel One',
});

export const API_MAX_RESULTS = 1000;

export enum SUB_ACTION {
  EXECUTE_SCRIPT = 'executeScript',
  GET_AGENTS = 'getAgents',
  ISOLATE_HOST = 'isolateHost',
  RELEASE_HOST = 'releaseHost',
  GET_REMOTE_SCRIPTS = 'getRemoteScripts',
  GET_REMOTE_SCRIPT_STATUS = 'getRemoteScriptStatus',
  GET_REMOTE_SCRIPT_RESULTS = 'getRemoteScriptResults',
  DOWNLOAD_REMOTE_SCRIPT_RESULTS = 'downloadRemoteScriptResults',
  FETCH_AGENT_FILES = 'fetchAgentFiles',
  DOWNLOAD_AGENT_FILE = 'downloadAgentFile',
  GET_ACTIVITIES = 'getActivities',
}
