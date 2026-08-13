/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ZodType } from 'zod/v4';

/**
 * Some Zod object schema type
 *
 * This enforces only that the **output** of the schema is an object with unknown values,
 * not that it is of the type `ZodObject`.
 */
export type ZodObjectType = ZodType<Record<string, unknown>>;
