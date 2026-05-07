/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type Joi from 'joi';
import joiToJsonParse from 'joi-to-json';
import { omit } from 'lodash';
import type { OpenAPIV3 } from 'openapi-types';
import type { Type } from '@kbn/config-schema';
import { isConfigSchema } from '@kbn/config-schema';
import type { z } from '@kbn/zod';
import { isZod, z as zod } from '@kbn/zod';

import { convert as zodConvert, unwrapZodType } from '../zod/lib';
import { stripInternalKbnOasMetaExtensions } from '../strip_internal_kbn_oas_meta';
import { zodSchemaFromKbnType } from './lib';
import { createCtx, postProcessMutations } from './post_process_mutations';
import type { IContext } from './post_process_mutations';

interface ParseArgs {
  schema: Joi.Schema | z.ZodTypeAny;
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

/**
 * Primary path: `@kbn/config-schema` exposes Zod v4 via `getSchema()`.
 * Fallback: legacy Joi schemas (tests / external callers) still use joi-to-json.
 */
export const joi2JsonInternal = (schema: unknown): ParseResult => {
  if (isConfigSchema(schema)) {
    return joi2JsonInternal(zodSchemaFromKbnType(schema as Type<any>));
  }
  if (isZod(schema)) {
    const zSchema = schema as z.ZodTypeAny;
    const { schema: main, shared } = zodConvert(zSchema, {});
    const rootUnwrapped = unwrapZodType(zSchema, true);
    const rootMeta = (zod.globalRegistry.get(rootUnwrapped as z.ZodTypeAny) ?? {}) as Record<
      string,
      unknown
    >;
    const rootId = typeof rootMeta.id === 'string' && rootMeta.id.length > 0 ? rootMeta.id : null;

    if (rootId && !('$ref' in main)) {
      const rootSchema = main as OpenAPIV3.SchemaObject;
      const title = typeof rootSchema.title === 'string' ? rootSchema.title : rootId;
      const sharedWithRoot = {
        ...shared,
        [rootId]: {
          ...rootSchema,
          title,
        },
      };
      return {
        $ref: `#/components/schemas/${rootId}`,
        schemas: sharedWithRoot,
      } as JoiToJsonReferenceObject;
    }

    if (Object.keys(shared).length > 0) {
      return { ...(main as Record<string, unknown>), schemas: shared } as JoiToJsonReferenceObject;
    }
    return main as OpenAPIV3.SchemaObject;
  }
  return joiToJsonParse(schema as Joi.Schema, 'open-api');
};

export const parse = ({ schema, ctx = createCtx() }: ParseArgs) => {
  const parsed: ParseResult = joi2JsonInternal(schema);
  let result: OpenAPIV3.SchemaObject;
  if (isJoiToJsonSpecialSchemas(parsed)) {
    Object.entries(parsed.schemas).forEach(([id, s]) => {
      postProcessMutations({ schema: s, ctx });
      ctx.addSharedSchema(id, s);
    });
    result = omit(parsed, 'schemas');
  } else {
    result = parsed;
  }
  postProcessMutations({ schema: result, ctx });
  stripInternalKbnOasMetaExtensions(result);
  Object.values(ctx.getSharedSchemas()).forEach((s) => stripInternalKbnOasMetaExtensions(s));
  return { shared: ctx.getSharedSchemas(), result };
};
