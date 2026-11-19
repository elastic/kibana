/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/**
 * Environment details shown by the environment badge. Shape-compatible with
 * Kibana's `PluginInitializerContext.env`, so it can be passed through as-is.
 */
export interface EnvironmentInfo {
  mode: {
    name: 'development' | 'production';
  };
  packageInfo?: {
    version?: string;
    branch?: string;
    buildNum?: number;
    buildSha?: string;
    buildShaShort?: string;
    buildDate?: Date | string | number;
    buildFlavor?: string;
    dist?: boolean;
  };
  /** Extra host-specific key/value pairs rendered in the environment tooltip. */
  labels?: Record<string, string>;
}
