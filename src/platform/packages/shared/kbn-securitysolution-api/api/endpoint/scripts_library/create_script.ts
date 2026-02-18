/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { schema, type TypeOf } from '@kbn/config-schema';
import type { DeepMutable } from '../../../endpoint/types';
import {
  ScriptDescriptionSchema,
  ScriptExampleSchema,
  ScriptFileSchema,
  ScriptInstructionsSchema,
  ScriptNameSchema,
  ScriptPathToExecutableSchema,
  ScriptPlatformSchema,
  ScriptRequiresInputSchema,
  ScriptTagsSchema,
} from './common';

export const CreateScriptRequestSchema = {
  body: schema.object({
    name: ScriptNameSchema,
    platform: ScriptPlatformSchema,
    file: ScriptFileSchema,
    requiresInput: schema.maybe(ScriptRequiresInputSchema),
    description: schema.maybe(ScriptDescriptionSchema),
    instructions: schema.maybe(ScriptInstructionsSchema),
    example: schema.maybe(ScriptExampleSchema),
    pathToExecutable: schema.maybe(ScriptPathToExecutableSchema),
    tags: schema.maybe(ScriptTagsSchema),
  }),
};

export type CreateScriptRequestBody = DeepMutable<TypeOf<typeof CreateScriptRequestSchema.body>>;
