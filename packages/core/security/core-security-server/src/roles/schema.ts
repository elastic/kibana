/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/**
 * Type representing Elasticsearch specific portion of the role definition.
 */
export interface ElasticsearchPrivilegesType {
  cluster?: string[];
  remote_cluster?: Array<{
    privileges: string[];
    clusters: string[];
  }>;
  indices?: Array<{
    names: string[];
    field_security?: Record<'grant' | 'except', string[]>;
    privileges: string[];
    query?: string;
    allow_restricted_indices?: boolean;
  }>;
  remote_indices?: Array<{
    clusters: string[];
    names: string[];
    field_security?: Record<'grant' | 'except', string[]>;
    privileges: string[];
    query?: string;
    allow_restricted_indices?: boolean;
  }>;
  run_as?: string[];
}
/**
 * Type representing Kibana specific portion of the role definition.
 */
export type KibanaPrivilegesType = Array<{
  spaces: string[];
  base?: string[];
  feature?: Record<string, string[]>;
}>;
