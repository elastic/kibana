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
 * Builds an Elasticsearch request from connector definitions
 * This is shared between the execution engine and the YAML editor copy functionality
 */
export declare function buildElasticsearchRequest(
  stepType: string,
  params: Record<string, unknown>
): RequestOptions;
