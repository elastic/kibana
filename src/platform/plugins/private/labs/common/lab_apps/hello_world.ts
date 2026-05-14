/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

export const HELLO_WORLD_LAB_ID = 'hello_world' as const;
export const HELLO_WORLD_APP_ID = 'labsHelloWorld';
export const HELLO_WORLD_API_PATH = '/internal/labs/hello_world/hello';

export interface HelloWorldResponse {
  message: string;
}
