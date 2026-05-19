/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/**
 * Get externals mapping for shared dependencies.
 *
 * Spreads the canonical externals from @kbn/ui-shared-deps-src (the single
 * source of truth shared with the legacy webpack optimizer) so that any
 * addition there is automatically picked up here.
 */
export declare function getExternals(): Record<string, string>;
