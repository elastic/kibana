/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

// Export core types derived from generated file
export type { TSemconvFields, SemconvFieldName } from './types';

// Export generated data (will be available after build)
export { semconvFlat } from './generated/resolved-semconv';

export { RESOURCE_ECS_FIELDS as RESOURCE_FIELDS, prefixOTelField } from './resource_fields';

// Export processing functionality
export { processSemconvYaml } from './lib/generate_semconv';
export { cli } from './cli';

// Export processing types
export type {
  ResolvedSemconvYaml,
  YamlGroup,
  ProcessingResult,
  ProcessingOptions,
} from './types/semconv_types';
