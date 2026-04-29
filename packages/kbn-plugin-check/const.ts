/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/** Type types of plugin classes within a single plugin. */
export const PLUGIN_LAYERS = ['server', 'client'] as const;

/** The lifecycles a plugin class implements. */
export const PLUGIN_LIFECYCLES = ['setup', 'start'] as const;

/** An enum representing the dependency requirements for a plugin. */
export const PLUGIN_REQUIREMENTS = ['required', 'optional'] as const;

/** An enum representing the manifest requirements for a plugin. */
export const MANIFEST_REQUIREMENTS = ['required', 'optional', 'bundle'] as const;

/** The state of a particular dependency as it relates to the plugin manifest. */
export const MANIFEST_STATES = ['required', 'optional', 'bundle', 'missing'] as const;

/**
 * The state of a particular dependency as it relates to a plugin class.  Includes states where the
 * plugin is missing properties to determine that state.
 */
export const PLUGIN_STATES = ['required', 'optional', 'missing', 'no class', 'unknown'] as const;

/** The state of the dependency for the entire plugin. */
export const DEPENDENCY_STATES = ['required', 'optional', 'mismatch'] as const;

/** An enum representing how the dependency status was derived from the plugin class. */
export const SOURCE_OF_TYPE = ['implements', 'method', 'none'] as const;
