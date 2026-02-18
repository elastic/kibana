/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type {
  BulkActionEditPayloadIndexPatterns,
  BulkActionEditPayloadInvestigationFields,
  BulkActionEditPayloadRuleActions,
  BulkActionEditPayloadSchedule,
  BulkActionEditPayloadTags,
  BulkActionEditPayloadTimeline,
  BulkActionEditPayloadAlertSuppression,
} from './bulk_actions_route.gen';

/**
 * actions that modify rules attributes
 */
export type BulkActionEditForRuleAttributes =
  | BulkActionEditPayloadTags
  | BulkActionEditPayloadRuleActions
  | BulkActionEditPayloadSchedule;

/**
 * actions that modify rules params
 */
export type BulkActionEditForRuleParams =
  | BulkActionEditPayloadIndexPatterns
  | BulkActionEditPayloadInvestigationFields
  | BulkActionEditPayloadTimeline
  | BulkActionEditPayloadAlertSuppression
  | BulkActionEditPayloadSchedule;
