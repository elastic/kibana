/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/**
 * Synthetic timeline id for the in-editor unsaved row.
 * Must remain stable across sessions and must not collide with persisted
 * change-history `event.id` values from Elasticsearch.
 */
export const WORKFLOW_UNSAVED_CHANGE_ID = '__workflow_unsaved__';
