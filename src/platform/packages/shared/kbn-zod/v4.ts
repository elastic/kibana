/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

// Re-export everything from zod/v4 first (this exports the z namespace type)
export * from 'zod/v4';
// Then import z as a value to augment it
import { z as zodV4 } from 'zod/v4';
import { fromJSONSchema } from './from_json_schema';

// Augment z value with fromJSONSchema to match native Zod v4 API
Object.assign(zodV4, { fromJSONSchema });

// Re-export the augmented z value
// The z namespace type from 'zod/v4' is already exported above and will merge with this value export
export { zodV4 as z };
