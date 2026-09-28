/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

export { run } from './src/cli';
export type {
  JsonValue,
  JsonObject,
  VariantName,
  VariantManifest,
  IndexManifest,
} from './src/types';
export { transformToStrict, transformToTemplate } from './src/template_transform';
export { extractStepTypes, extractTriggerTypes } from './src/introspect';
export { checkCompleteness } from './src/completeness';
export type { CompletenessInput, CompletenessResult } from './src/completeness';
