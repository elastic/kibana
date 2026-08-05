/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import {
  buildTemplateTolerantJsonSchema,
  wholeValueStringAlternative,
  TEMPLATE_VALUE_DEF_NAME,
} from '@kbn/workflows-yaml';
import { INSTALL_PLACEHOLDER } from '@kbn/workflows-library';
import type { JsonObject } from './types';

// Re-exported so introspection/tests can strip the wrapper the weaver adds.
export { TEMPLATE_VALUE_DEF_NAME };

/**
 * The `__install__.<name>` install-placeholder as a whole-value string
 * alternative, sourced from `@kbn/workflows-library` (the single owner of that
 * regex) so the artifact never drifts from the renderer. Confined to the
 * `template` variant - a separate system from LiquidJS runtime templating.
 */
const installAlternative = (): JsonObject =>
  wholeValueStringAlternative(INSTALL_PLACEHOLDER.source);

/**
 * `strict` variant: the composed schema with LiquidJS tolerance woven into every
 * typed value position that would otherwise reject a bare template string.
 */
export const transformToStrict = (schema: JsonObject): JsonObject =>
  buildTemplateTolerantJsonSchema(schema);

/**
 * `template` variant: `strict` plus the `__install__.<name>` placeholder in the
 * shared template-value definition (for installable library templates).
 */
export const transformToTemplate = (schema: JsonObject): JsonObject =>
  buildTemplateTolerantJsonSchema(schema, { extraAlternatives: [installAlternative()] });
