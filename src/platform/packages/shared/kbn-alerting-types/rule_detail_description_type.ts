/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

export const RULE_DETAIL_DESCRIPTION_FIELD_TYPES = {
  INDEX_PATTERN: 'indexPattern',
  CUSTOM_QUERY: 'customQuery',
  ESQL_QUERY: 'esqlQuery',
  DATA_VIEW_ID: 'dataViewId',
  DATA_VIEW_INDEX_PATTERN: 'dataViewIndexPattern',
} as const;

export type RuleDetailDescriptionFieldType =
  (typeof RULE_DETAIL_DESCRIPTION_FIELD_TYPES)[keyof typeof RULE_DETAIL_DESCRIPTION_FIELD_TYPES];
