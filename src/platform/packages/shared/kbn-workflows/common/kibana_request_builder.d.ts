/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { RequestOptions } from '../types/latest';
/**
 * Builds a Kibana HTTP request from connector definitions
 * This is shared between the execution engine and the YAML editor copy functionality
 */
export declare function buildKibanaRequest(
  actionType: string,
  params: Record<string, unknown>,
  spaceId?: string
): RequestOptions;
/**
 * Applies the space prefix to the path for non-default spaces
 * Following Kibana's standard space-aware API pattern: /s/{spaceId}/api/...
 */
export declare function applySpacePrefix(path: string, spaceId?: string): string;
