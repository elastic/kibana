/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

export type {
  EndpointDefinition,
  EndpointDescription,
  EndpointsAvailability,
} from '../../common/types';
import type { EndpointDescription, EndpointsAvailability } from '../../common/types';

export interface FileSystemAdapter {
  readFileSync: (path: string, encoding: 'utf8') => string;
  globSync: (pattern: string) => string[];
  normalizePath: (path: string) => string;
  join: (...paths: string[]) => string;
  basename: (path: string) => string;
}

export interface SpecDefinitionsConfig {
  definitionsPath: string;
  stackVersion: string;
  endpointsAvailability?: EndpointsAvailability;
  fs: FileSystemAdapter;
}

export interface SpecDefinitionsResult {
  name: string;
  globals: Record<string, any>;
  endpoints: Record<string, EndpointDescription>;
}
