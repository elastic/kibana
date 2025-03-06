/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/**
 * The base group, for all modules that are commonly used across solutions.
 */
export const KibanaPlatform = 'platform' as const;

/**
 * A list of all Kibana solution.
 */
export const KibanaSolutions = ['observability', 'security', 'search', 'TBCworkchat'] as const;

/**
 * A type that defines the existing solutions.
 */
export type KibanaSolution = (typeof KibanaSolutions)[number];

/**
 * A list of all Kibana groups (platform + solutions).
 */
export const KibanaGroups = [KibanaPlatform, ...KibanaSolutions] as const;

/**
 * A type that defines the existing groups (platform + solutions).
 */
export type KibanaGroup = (typeof KibanaGroups)[number];

/**
 * The groups to which a module can belong.
 * 'common' is the default for uncategorised modules.
 */
export type ModuleGroup = KibanaGroup | 'common';

/**
 * ModuleVisibility tells whether a module is accessible from any module (shared) or only from modules of the same group (private)
 */
export type ModuleVisibility = 'private' | 'shared';
