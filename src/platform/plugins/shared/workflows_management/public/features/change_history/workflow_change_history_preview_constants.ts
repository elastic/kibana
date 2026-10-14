/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/** Debounce after monaco-yaml schema update before treating marker changes as settled. */
export const WORKFLOW_CHANGE_HISTORY_VALIDATION_DEBOUNCE_MS = 150;

/**
 * Max wait for the first yaml schema marker pass before publishing initial results.
 * Valid YAML with zero schema errors may never emit markers; we publish after this
 * timeout. Markers arriving later are merged via the hook's post-initial republish
 * listener (may briefly show an empty accordion on very slow clients).
 */
export const WORKFLOW_CHANGE_HISTORY_VALIDATION_MARKER_MAX_WAIT_MS = 3000;

/**
 * Shorter max wait when global monaco-yaml schemas are already registered and we only
 * need the worker to validate a newly mounted preview model (version switch).
 */
export const WORKFLOW_CHANGE_HISTORY_VALIDATION_MARKER_REUSE_MAX_WAIT_MS = 400;
