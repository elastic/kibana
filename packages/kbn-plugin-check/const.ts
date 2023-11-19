/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

export const PLUGIN_LAYERS = ['server', 'client'] as const;
export const PLUGIN_LIFECYCLES = ['setup', 'start'] as const;
export const PLUGIN_REQUIREMENTS = ['required', 'optional'] as const;
export const MANIFEST_REQUIREMENTS = ['required', 'optional', 'bundle'] as const;

export const MANIFEST_STATES = ['required', 'optional', 'bundle', 'missing'] as const;
export const PLUGIN_STATES = ['required', 'optional', 'missing', 'no class', 'unknown'] as const;
export const DEPENDENCY_STATES = ['required', 'optional', 'mismatch'] as const;

export const SOURCE_OF_TYPE = ['implements', 'method', 'none'] as const;
