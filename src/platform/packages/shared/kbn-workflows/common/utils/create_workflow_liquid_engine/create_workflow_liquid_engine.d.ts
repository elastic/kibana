/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { Liquid, LiquidOptions } from 'liquidjs';
/**
 * LiquidJS tags supported in workflow templates.
 * Tags not in this set are removed from the engine.
 */
export declare const LIQUID_ALLOWED_TAGS: Set<string>;
/**
 * Creates a LiquidJS engine configured for workflow templates.
 * Uses an in-memory filesystem, restricts tags to the supported set,
 * and enables ownPropertyOnly.
 *
 * Callers can pass additional {@link LiquidOptions} (e.g. `strictFilters`)
 * which are merged with the enforced defaults.
 */
export declare const createWorkflowLiquidEngine: (options?: LiquidOptions) => Liquid;
/**
 * Registers the custom filters required by workflow templates onto the given engine.
 * Called automatically by {@link createWorkflowLiquidEngine}; exposed for testing.
 *
 * Registering centrally here ensures every engine instance (server-side execution,
 * YAML validation, editor evaluation) uses identical filter implementations and
 * eliminates the risk of divergence (e.g. a no-op stub instead of the real function).
 */
export declare const registerWorkflowLiquidFilters: (engine: Liquid) => void;
