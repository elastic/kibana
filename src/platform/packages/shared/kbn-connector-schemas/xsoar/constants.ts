/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */
import { i18n } from '@kbn/i18n';

export const CONNECTOR_ID = '.xsoar';
export const CONNECTOR_NAME = i18n.translate('connectors.xsoar.title', {
  defaultMessage: 'XSOAR',
});

export enum SUB_ACTION {
  PLAYBOOKS = 'getPlaybooks',
  RUN = 'run',
}
export enum XSOARSeverity {
  INFORMATIONAL = 0.5,
  UNKNOWN = 0,
  LOW = 1,
  MEDIUM = 2,
  HIGH = 3,
  CRITICAL = 4,
}
