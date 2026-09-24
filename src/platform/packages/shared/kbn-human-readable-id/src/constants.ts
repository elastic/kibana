/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

// IDs must start and end with a lowercase alphanumeric character, contain only lowercase
// alphanumeric chars and hyphens in the middle. Length is enforced separately via
// HUMAN_READABLE_ID_MIN_LENGTH (3) and HUMAN_READABLE_ID_MAX_LENGTH (255).
// This supports semantic IDs ("security-alert-enrichment"), legacy prefix-{uuid} format,
// plain UUIDs, while rejecting leading/trailing separators, snake case and
// special characters like spaces, dots, or '@'.
//
// NOTE: The regex intentionally allows 1-2 char IDs (the inner group is optional).
// The 3-char minimum is enforced by HUMAN_READABLE_ID_MIN_LENGTH at the Zod schema
// level so that the pattern and length constraints remain independently testable.
export const HUMAN_READABLE_ID_PATTERN = /^[a-z0-9]([a-z0-9-]*[a-z0-9])?$/;
export const HUMAN_READABLE_ID_MAX_LENGTH = 255;
export const HUMAN_READABLE_ID_MIN_LENGTH = 3;

export const MAX_COLLISION_RETRIES = 100;

/** Known prototype-pollution keys that must never be used as IDs. */
export const UNSAFE_IDS = new Set(['__proto__', 'constructor', 'prototype']);
