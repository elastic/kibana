/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { type ZodType } from '@kbn/zod';
import type { Type } from '@kbn/config-schema';
/**
 * Validate an object based on a schema.
 *
 * @param obj The object to validate
 * @param objSchema The schema to validate the object against
 * @returns null, or Error
 */
export declare const validateObj: (obj: unknown, objSchema?: Type<any> | ZodType) => Error | null;
export { validateVersion } from '@kbn/object-versioning-utils';
