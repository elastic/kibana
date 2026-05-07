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
import type { z } from '@kbn/zod';
import { isZod, z as zod } from '@kbn/zod';
import type { OpenAPIV3 } from 'openapi-types';
import { parse } from '../../parse';
import { unwrapZodType } from '../../../zod/lib';
import { isReferenceObject } from '../../../common';
import {
  deleteField,
  stripBadDefault,
  processAvailability,
  processDeprecated,
  processDiscontinued,
} from './utils';
import type { IContext } from '../context';

const {
  META_FIELD_X_OAS_MAX_LENGTH,
  META_FIELD_X_OAS_MIN_LENGTH,
  META_FIELD_X_OAS_GET_ADDITIONAL_PROPERTIES,
} = metaFields;

export const processString = (schema: OpenAPIV3.SchemaObject): void => {
  if (META_FIELD_X_OAS_MIN_LENGTH in schema) {
    schema.minLength = schema[META_FIELD_X_OAS_MIN_LENGTH] as number;
    deleteField(schema, META_FIELD_X_OAS_MIN_LENGTH);
  }
  if (META_FIELD_X_OAS_MAX_LENGTH in schema) {
    schema.maxLength = schema[META_FIELD_X_OAS_MAX_LENGTH] as number;
    deleteField(schema, META_FIELD_X_OAS_MAX_LENGTH);
  }
};

export const processStream = (schema: OpenAPIV3.SchemaObject): void => {
  schema.type = 'object';
};

const processAdditionalProperties = (ctx: IContext, schema: OpenAPIV3.SchemaObject) => {
  if (META_FIELD_X_OAS_GET_ADDITIONAL_PROPERTIES in schema) {
    const fn = schema[META_FIELD_X_OAS_GET_ADDITIONAL_PROPERTIES] as () => Joi.Schema<unknown>;
    const additionalPropertiesSchema = fn() as unknown;
    const { result: additionalSchema } = parse({ ctx, schema: additionalPropertiesSchema as any });

    if (!isReferenceObject(additionalSchema) && isZod(additionalPropertiesSchema)) {
      const unwrapped = unwrapZodType(additionalPropertiesSchema as z.ZodTypeAny, true);
      const meta = (zod.globalRegistry.get(unwrapped as z.ZodTypeAny) ?? {}) as Record<
        string,
        unknown
      >;
      const id = typeof meta.id === 'string' && meta.id.length > 0 ? meta.id : null;
      if (id) {
        const schemaWithTitle = additionalSchema as OpenAPIV3.SchemaObject;
        ctx.addSharedSchema(id, {
          ...schemaWithTitle,
          title: typeof schemaWithTitle.title === 'string' ? schemaWithTitle.title : id,
        });
        schema.additionalProperties = { $ref: `#/components/schemas/${id}` };
        deleteField(schema, META_FIELD_X_OAS_GET_ADDITIONAL_PROPERTIES);
        return;
      }
    }

    schema.additionalProperties = additionalSchema;
    deleteField(schema, META_FIELD_X_OAS_GET_ADDITIONAL_PROPERTIES);
  } else if (schema.additionalProperties === undefined) {
    schema.additionalProperties = true;
  }
};

export const processRecord = (ctx: IContext, schema: OpenAPIV3.SchemaObject): void => {
  schema.type = 'object';
  processAdditionalProperties(ctx, schema);
};

export const processMap = (ctx: IContext, schema: OpenAPIV3.SchemaObject): void => {
  schema.type = 'object';
  processAdditionalProperties(ctx, schema);
};

export const processAllTypes = (ctx: IContext, schema: OpenAPIV3.SchemaObject): void => {
  processAvailability(ctx, schema);
  processDeprecated(schema);
  processDiscontinued(schema);
  stripBadDefault(schema);
};

export const processAnyType = (schema: OpenAPIV3.SchemaObject): void => {
  const { description, nullable } = schema;
  for (const key of Object.keys(schema)) {
    deleteField(schema as unknown as Record<any, unknown>, key);
  }
  if (description) {
    schema.description = description;
  }
  (schema as Record<string, unknown>).nullable = nullable ?? true;
};

export { processObject } from './object';

export { processEnum } from './enum';

export { processDiscriminator } from './discriminator';
