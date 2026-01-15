/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */
import { i18n } from '@kbn/i18n';

export const CONNECTOR_ID = '.thehive';
export const CONNECTOR_NAME = i18n.translate('connectors.thehive.title', {
  defaultMessage: 'TheHive',
});

export enum SUB_ACTION {
  PUSH_TO_SERVICE = 'pushToService',
  CREATE_ALERT = 'createAlert',
}
export enum TheHiveSeverity {
  LOW = 1,
  MEDIUM = 2,
  HIGH = 3,
  CRITICAL = 4,
}
export enum TheHiveTLP {
  CLEAR = 0,
  GREEN = 1,
  AMBER = 2,
  AMBER_STRICT = 3,
  RED = 4,
}
