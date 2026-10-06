/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/**
 * Manually applies the specific configuration overrides we need to load the APM config.
 * Currently, only these are needed:
 *   - server.uuid
 *   - path.data
 *   - elastic.apm.*
 *   - telemetry.*
 *   - monitoring_collection.*
 */
export declare const applyConfigOverrides: (config: Record<string, any>, argv: string[]) => void;
