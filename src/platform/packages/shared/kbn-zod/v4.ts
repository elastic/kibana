/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { z as zodV4 } from 'zod/v4';

// Re-export all Zod exports (types and values)
export * from 'zod/v4';

// Temporary polyfill: Augment z with fromJSONSchema until Kibana upgrades to Zod v4+
// where z.fromJSONSchema will be available natively. This allows consumers to use
// the same API (z.fromJSONSchema) now and later without code changes.
//
// Lazy-load fromJSONSchema to avoid bundling it when only types are needed.
// This prevents plugins that only import types from pulling in the polyfill code.
// Using a getter with a factory function pattern that webpack can tree-shake.
// The import is wrapped in a function so webpack only includes it when the getter is accessed.
function createFromJSONSchemaGetter() {
  let fromJSONSchemaImpl: typeof import('./from_json_schema').fromJSONSchema | undefined;

  return function getFromJSONSchema() {
    if (!fromJSONSchemaImpl) {
      // Use a factory pattern that webpack can tree-shake
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      fromJSONSchemaImpl = require('./from_json_schema').fromJSONSchema;
    }
    return fromJSONSchemaImpl;
  };
}

const getFromJSONSchema = createFromJSONSchemaGetter();

// When Kibana upgrades to true Zod v4, this entire file can be replaced with:
//   export { z } from 'zod/v4';
export const z = Object.assign(zodV4, {
  get fromJSONSchema() {
    return getFromJSONSchema();
  },
});

// Namespace merging to preserve type utilities during the polyfill period.
//
// TypeScript doesn't support wildcard type re-exports, so we manually list the
// type utilities actually used across the codebase.
// eslint-disable-next-line @typescript-eslint/no-namespace -- Namespaces are discouraged in modern TS, but required here to restore type utilities that Object.assign loses
export namespace z {
  // eslint-disable-next-line @typescript-eslint/naming-convention -- Must match Zod's API: z.infer<T>
  export type infer<T extends zodV4.ZodType> = zodV4.infer<T>;
  // @ts-expect-error -- Input constraint is enforced by zodV4.ZodType at usage (not definition)
  export type ZodType<Output = any, Def = any, Input = any> = zodV4.ZodType<Output, Def, Input>;
  export type ZodObject<T extends zodV4.ZodRawShape = zodV4.ZodRawShape> = zodV4.ZodObject<T>;
  export type ZodRawShape = zodV4.ZodRawShape;
  export type ZodSchema<T = any> = zodV4.ZodSchema<T>;
}
