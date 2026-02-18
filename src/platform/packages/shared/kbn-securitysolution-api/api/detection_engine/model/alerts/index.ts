/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type {
  AncestorLatest,
  DetectionAlert800,
  DetectionAlertLatest,
  DetectionAlertRead,
  WrappedAlert,
} from './schema';

import type { NewTermsAlertLatest } from './new_terms_alert_schema';

import type { EqlBuildingBlockAlertLatest, EqlShellAlertLatest } from './eql_alert_schema';

export type {
  AncestorLatest,
  DetectionAlert800,
  DetectionAlertLatest,
  DetectionAlertRead as DetectionAlert,
  EqlBuildingBlockAlertLatest,
  EqlShellAlertLatest,
  NewTermsAlertLatest,
  WrappedAlert,
};
