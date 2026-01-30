/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

export const MIN_OPTIONS_LIST_REQUEST_SIZE = 10;
export const MAX_OPTIONS_LIST_REQUEST_SIZE = 1000;
export const MAX_OPTIONS_LIST_BULK_SELECT_SIZE = 100;

/**
 * Special selection value used by the Options List control when filtering
 * `kibana.alert.workflow_assignee_ids` for documents with no assignees (missing field).
 */
export const NO_ASSIGNEES_OPTION_KEY = '__options_list_no_assignees__';
