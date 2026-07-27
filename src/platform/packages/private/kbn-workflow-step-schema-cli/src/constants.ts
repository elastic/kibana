/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/**
 * Whole-value install placeholder pattern. Mirrors `INSTALL_PLACEHOLDER`
 * (`/__install__\.([a-zA-Z0-9_-]+)/`) in
 * `@kbn/workflows-library` `render_template.ts`, anchored to the whole value
 * because we accept it as a standalone typed value (e.g. `maxAgeInDays:
 * __install__.max-age-in-days` in a `number` field). Confined to the `template`
 * variant - a separate system from LiquidJS runtime templating.
 */
export const INSTALL_PLACEHOLDER_VALUE_REGEX = /^__install__\.[a-zA-Z0-9_-]+$/;

export const DEFAULT_KIBANA_URL = 'http://localhost:5601';

/**
 * Gzip byte threshold that triggers chunking. Provisional starting point
 * pending calibration from the measurement reported by this tool (a variant
 * whose gzip size is at/above this becomes `chunked`; otherwise `single`).
 */
export const DEFAULT_CHUNK_THRESHOLD_BYTES = 512 * 1024;

export const DEFAULT_CHANNEL = 'release';

/** Public API version required by the reused versioned routes. */
export const KIBANA_API_VERSION = '2023-10-31';
