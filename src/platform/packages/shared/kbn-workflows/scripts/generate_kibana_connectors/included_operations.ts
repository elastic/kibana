/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

// Re-export from the single source of truth
export { OPERATION_TYPE_OVERRIDES } from '../../spec/kibana/aliases';

/**
 * List of OpenAPI operation IDs to include in the generated Kibana connectors.
 */
export const INCLUDED_OPERATIONS = [
  'createCaseDefaultSpace',
  'post_agent_builder_converse',
  'getCaseDefaultSpace',
  'updateCaseDefaultSpace',
  'addCaseCommentDefaultSpace',
  'SetAlertsStatus',
  'SetAlertTags',
];
