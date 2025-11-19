/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */
import { i18n } from '@kbn/i18n';

export const CONNECTOR_ID = '.gemini';
export const CONNECTOR_NAME = i18n.translate('connectors.gemini.title', {
  defaultMessage: 'Google Gemini',
});

export enum SUB_ACTION {
  RUN = 'run',
  DASHBOARD = 'getDashboard',
  TEST = 'test',
  INVOKE_AI = 'invokeAI',
  INVOKE_AI_RAW = 'invokeAIRaw',
  INVOKE_STREAM = 'invokeStream',
}

export const DEFAULT_TOKEN_LIMIT = 8192;
export const DEFAULT_TIMEOUT_MS = 180000;
export const DEFAULT_GCP_REGION = 'us-central1';
export const DEFAULT_MODEL = 'gemini-2.5-pro';
export const DEFAULT_URL = `https://us-central1-aiplatform.googleapis.com` as const;
