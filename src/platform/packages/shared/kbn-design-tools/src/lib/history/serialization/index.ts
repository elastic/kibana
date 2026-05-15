/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

export { toPath, fromPath } from './element_path';
export type { ElementPath, ResolveResult } from './element_path';

export {
  serializeTransaction,
  deserializeTransaction,
  serializeSession,
  deserializeSession,
} from './serializer';
export type { DeserializeResult, DeserializeSessionResult } from './serializer';

export type {
  SerializedSession,
  SerializedTransaction,
  SerializedSessionSnapshot,
  SerializedStyleChange,
  SerializedTextNodeChange,
  SerializedSourceChange,
  SerializedRect,
} from './types';
