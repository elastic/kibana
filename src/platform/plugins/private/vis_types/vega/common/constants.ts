/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/** Frozen as part of the Dashboard REST API (`panels[].type`). */
export const VEGA_EMBEDDABLE_TYPE = 'vega';

/**
 * Feature flag gating the standalone Vega embeddable (UI creation actions + public API schema
 * participation). Off by default.
 */
export const VEGA_STANDALONE_EMBEDDABLE_FLAG = 'vega.standaloneEmbeddable';
