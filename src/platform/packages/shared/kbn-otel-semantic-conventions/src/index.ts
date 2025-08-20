/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

export {
  semconvFlat,
  semconvStats,
  type SemconvFieldName,
  type TSemconvFields,
} from './generated/resolved-semconv';

export { processSemconvYaml } from './lib/generate_semconv';
export { cli } from './cli';

export type {
  ResolvedSemconvYaml,
  YamlGroup,
  SemconvFieldDefinitions,
  ProcessingResult,
  ProcessingOptions,
} from './types/semconv_types';
