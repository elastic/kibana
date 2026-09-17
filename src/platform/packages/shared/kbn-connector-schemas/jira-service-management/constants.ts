/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */
import { i18n } from '@kbn/i18n';

export const CONNECTOR_ID = '.jira-service-management';
export const CONNECTOR_NAME = i18n.translate('connectors.jiraServiceManagement.title', {
  defaultMessage: 'Jira Service Management',
});

export const MESSAGE_NON_EMPTY = i18n.translate(
  'xpack.stackConnectors.jiraServiceManagement.nonEmptyMessageField',
  {
    defaultMessage: 'must be populated with a value other than just whitespace',
  }
);

/** Jira Service Management's create-alert `message` API limit. */
export const MESSAGE_MAX_LENGTH = 130;

/** HTTP-facing schema bound for `message`; the connector truncates to `MESSAGE_MAX_LENGTH`. */
export const MESSAGE_SCHEMA_MAX_LENGTH = 15000;

export enum SUB_ACTION {
  CreateAlert = 'createAlert',
  CloseAlert = 'closeAlert',
}
