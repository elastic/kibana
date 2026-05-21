/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type Joi from 'joi';
import { metaFields } from '@kbn/config-schema';
import joiToJsonParse from 'joi-to-json';
import { omit } from 'lodash';
import type { OpenAPIV3 } from 'openapi-types';
import { isReferenceObject } from '../common';
import { createCtx, postProcessMutations } from './post_process_mutations';
import type { IContext } from './post_process_mutations';

interface ParseArgs {
  schema: Joi.Schema;
  ctx?: IContext;
}

export interface JoiToJsonReferenceObject extends OpenAPIV3.BaseSchemaObject {
  schemas: { [id: string]: OpenAPIV3.SchemaObject };
}

type ParseResult = OpenAPIV3.SchemaObject | JoiToJsonReferenceObject;

export const isJoiToJsonSpecialSchemas = (
  parseResult: ParseResult
): parseResult is JoiToJsonReferenceObject => {
  return 'schemas' in parseResult;
};

export const joi2JsonInternal = (schema: Joi.Schema) => {
  return joiToJsonParse(schema, 'open-api');
};

// Based on how default values manifest from config-schema
// having a default value as a function { defaultValue: () => undefined } means
// config schema will treat that as the default value, so we stick to that as the map
// for determining whether, at runtime, a given schema will default.
const hasRuntimeOptionalMetadata = (description: Joi.Description): boolean => {
  const defaultValue = (description.flags as { default?: unknown } | undefined)?.default;
  const hasDefaultValue =
    defaultValue !== undefined &&
    // see post_process_mutations/mutations/object.ts
    !(
      typeof defaultValue === 'object' &&
      defaultValue !== null &&
      (defaultValue as { special?: unknown }).special === 'deep' &&
      Object.keys(defaultValue).length === 1
    );

  return (
    hasDefaultValue ||
    Boolean(description.metas?.some((meta) => meta[metaFields.META_FIELD_X_OAS_OPTIONAL] === true))
  );
};

const addInternalOptionalMarker = (
  schema: OpenAPIV3.SchemaObject | OpenAPIV3.ReferenceObject
): void => {
  Object.defineProperty(schema, metaFields.META_FIELD_X_OAS_OPTIONAL, {
    configurable: true,
    enumerable: false,
    value: true,
    writable: true,
  });
};

const applyPropertyRuntimeMetadata = (
  description: Joi.Description,
  openApiSchema: OpenAPIV3.SchemaObject | OpenAPIV3.ReferenceObject
): void => {
  if (isReferenceObject(openApiSchema)) {
    if (hasRuntimeOptionalMetadata(description)) {
      addInternalOptionalMarker(openApiSchema);
    }
    return;
  }

  const { keys } = description as Joi.Description & { keys?: Record<string, Joi.Description> };
  if (keys && openApiSchema.properties) {
    for (const [key, childDescription] of Object.entries(keys)) {
      const childSchema = openApiSchema.properties[key] as
        | OpenAPIV3.SchemaObject
        | OpenAPIV3.ReferenceObject
        | undefined;
      if (childSchema) {
        applyPropertyRuntimeMetadata(childDescription, childSchema);
      }
    }
  }
};

const applySharedSchemaRuntimeMetadata = (
  description: Joi.Description,
  sharedSchemas: Record<string, OpenAPIV3.SchemaObject>
): void => {
  const id = (description.flags as { id?: string } | undefined)?.id;
  if (id && sharedSchemas[id]) {
    applyPropertyRuntimeMetadata(description, sharedSchemas[id]);
  }

  const { keys, matches, items, rules, whens } = description as Joi.Description & {
    keys?: Record<string, Joi.Description>;
    matches?: Array<{
      schema?: Joi.Description;
      then?: Joi.Description;
      otherwise?: Joi.Description;
      switch?: Array<{ then?: Joi.Description; otherwise?: Joi.Description }>;
    }>;
    items?: Joi.Description[];
    rules?: Array<{ args?: { key?: Joi.Description; value?: Joi.Description } }>;
    whens?: Array<{ then?: Joi.Description; otherwise?: Joi.Description }>;
  };

  Object.values(keys ?? {}).forEach((childDescription) => {
    applySharedSchemaRuntimeMetadata(childDescription, sharedSchemas);
  });
  matches?.forEach(({ schema: matchedDescription }) => {
    if (matchedDescription) {
      applySharedSchemaRuntimeMetadata(matchedDescription, sharedSchemas);
    }
  });
  matches?.forEach((match) => {
    if (match.then) {
      applySharedSchemaRuntimeMetadata(match.then, sharedSchemas);
    }
    if (match.otherwise) {
      applySharedSchemaRuntimeMetadata(match.otherwise, sharedSchemas);
    }
    match.switch?.forEach((switchCase) => {
      if (switchCase.then) {
        applySharedSchemaRuntimeMetadata(switchCase.then, sharedSchemas);
      }
      if (switchCase.otherwise) {
        applySharedSchemaRuntimeMetadata(switchCase.otherwise, sharedSchemas);
      }
    });
  });
  items?.forEach((itemDescription) => {
    applySharedSchemaRuntimeMetadata(itemDescription, sharedSchemas);
  });
  rules?.forEach(({ args }) => {
    if (args?.key) {
      applySharedSchemaRuntimeMetadata(args.key, sharedSchemas);
    }
    if (args?.value) {
      applySharedSchemaRuntimeMetadata(args.value, sharedSchemas);
    }
  });
  whens?.forEach((when) => {
    if (when.then) {
      applySharedSchemaRuntimeMetadata(when.then, sharedSchemas);
    }
    if (when.otherwise) {
      applySharedSchemaRuntimeMetadata(when.otherwise, sharedSchemas);
    }
  });
};

const removeInternalOptionalMarker = (
  schema: unknown,
  seenSchemas: WeakSet<object> = new WeakSet()
): void => {
  if (!schema || typeof schema !== 'object') {
    return;
  }

  if (seenSchemas.has(schema)) {
    return;
  }
  seenSchemas.add(schema);

  delete (schema as Record<string, unknown>)[metaFields.META_FIELD_X_OAS_OPTIONAL];
  Object.values(schema).forEach((value) => removeInternalOptionalMarker(value, seenSchemas));
};

export const parse = ({ schema, ctx = createCtx() }: ParseArgs) => {
  const parsed: ParseResult = joi2JsonInternal(schema);
  let result: OpenAPIV3.SchemaObject;
  if (isJoiToJsonSpecialSchemas(parsed)) {
    result = omit(parsed, 'schemas');
    const schemaDescription = schema.describe();
    applySharedSchemaRuntimeMetadata(schemaDescription, parsed.schemas);
    if (!isReferenceObject(result)) {
      applyPropertyRuntimeMetadata(schemaDescription, result);
    }
    Object.entries(parsed.schemas).forEach(([id, s]) => {
      postProcessMutations({ schema: s, ctx });
      ctx.addSharedSchema(id, s);
    });
  } else {
    result = parsed;
    applyPropertyRuntimeMetadata(schema.describe(), result);
  }
  postProcessMutations({ schema: result, ctx });
  const shared = ctx.getSharedSchemas();
  removeInternalOptionalMarker(result);
  Object.values(shared).forEach((sharedSchema) => removeInternalOptionalMarker(sharedSchema));
  return { shared, result };
};
