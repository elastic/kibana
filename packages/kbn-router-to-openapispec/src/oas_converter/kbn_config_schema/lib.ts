/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import joi from 'joi';
import { isConfigSchema, Type, metaFields } from '@kbn/config-schema';
import { get } from 'lodash';
import type { OpenAPIV3 } from 'openapi-types';
import type { KnownParameters } from '../../type';
import { isReferenceObject } from '../common';
import { parse } from './parse';

import { createCtx, IContext } from './post_process_mutations';

export const getSharedComponentId = (schema: OpenAPIV3.SchemaObject) => {
  if (metaFields.META_FIELD_X_OAS_REF_ID in schema) {
    return schema[metaFields.META_FIELD_X_OAS_REF_ID] as string;
  }
};

export const removeSharedComponentId = (
  schema: OpenAPIV3.SchemaObject & { [metaFields.META_FIELD_X_OAS_REF_ID]?: string }
) => {
  const { [metaFields.META_FIELD_X_OAS_REF_ID]: id, ...rest } = schema;
  return rest;
};

export const sharedComponentIdToRef = (id: string): OpenAPIV3.ReferenceObject => {
  return {
    $ref: `#/components/schemas/${id}`,
  };
};

type IdSchemaTuple = [id: string, schema: OpenAPIV3.SchemaObject];

export const tryConvertToRef = (schema: OpenAPIV3.SchemaObject) => {
  const sharedId = getSharedComponentId(schema);
  if (sharedId) {
    const idSchema: IdSchemaTuple = [sharedId, removeSharedComponentId(schema)];
    return {
      idSchema,
      ref: sharedComponentIdToRef(sharedId),
    };
  }
};

const isObjectType = (schema: joi.Schema | joi.Description): boolean => {
  return schema.type === 'object';
};

const isRecordType = (schema: joi.Schema | joi.Description): boolean => {
  return schema.type === 'record';
};

// See the `schema.nullable` type in @kbn/config-schema
export const isNullableObjectType = (schema: joi.Schema | joi.Description): boolean => {
  if (schema.type === 'alternatives') {
    const { matches } = joi.isSchema(schema) ? schema.describe() : schema;
    return (
      matches.length === 2 &&
      matches.every(
        (match: { schema: joi.Description }) =>
          match.schema.type === 'object' ||
          (match.schema.type === 'any' &&
            get(match, 'schema.flags.only') === true &&
            get(match, 'schema.allow')?.length === 1 &&
            get(match, 'schema.allow.0') === null)
      )
    );
  }
  return false;
};

const isEmptyObjectAllowsUnknowns = (schema: joi.Description) => {
  return (
    isObjectType(schema) &&
    Object.keys(schema.keys).length === 0 &&
    get(schema, 'flags.unknown') === true
  );
};

const createError = (message: string) => {
  return new Error(`[@kbn/config-schema converter] ${message}`);
};

function assertInstanceOfKbnConfigSchema(schema: unknown): asserts schema is Type<any> {
  if (!is(schema)) {
    throw createError('Expected schema to be an instance of @kbn/config-schema');
  }
}

export const unwrapKbnConfigSchema = (schema: unknown): joi.Schema => {
  assertInstanceOfKbnConfigSchema(schema);
  return schema.getSchema();
};

export const convert = (kbnConfigSchema: unknown) => {
  const schema = unwrapKbnConfigSchema(kbnConfigSchema);
  const { result, shared } = parse({ schema, ctx: createCtx({ refs: true }) });
  return { schema: result, shared: Object.fromEntries(shared.entries()) };
};

const convertObjectMembersToParameterObjects = (
  ctx: IContext,
  schema: joi.Schema,
  knownParameters: KnownParameters = {},
  isPathParameter = false
) => {
  let properties: Exclude<OpenAPIV3.SchemaObject['properties'], undefined>;
  const required = new Map<string, boolean>();
  if (isNullableObjectType(schema)) {
    const { result } = parse({ schema, ctx });
    const anyOf = (result as OpenAPIV3.SchemaObject).anyOf as OpenAPIV3.SchemaObject[];
    properties = anyOf.find((s) => s.type === 'object')!.properties!;
  } else if (isObjectType(schema)) {
    const { result } = parse({ schema, ctx }) as { result: OpenAPIV3.SchemaObject };
    properties = (result as OpenAPIV3.SchemaObject).properties!;
    (result.required ?? []).forEach((key) => required.set(key, true));
  } else if (isRecordType(schema)) {
    return [];
  } else {
    throw createError(`Expected record, object or nullable object type, but got '${schema.type}'`);
  }

  return Object.entries(properties).map(([schemaKey, schemaObject]) => {
    if (!knownParameters[schemaKey] && isPathParameter) {
      throw createError(`Unknown parameter: ${schemaKey}, are you sure this is in your path?`);
    }
    const isSubSchemaRequired = required.has(schemaKey);
    let description: undefined | string;
    let finalSchema: OpenAPIV3.SchemaObject | OpenAPIV3.ReferenceObject;
    if (!isReferenceObject(schemaObject)) {
      const { description: des, ...rest } = schemaObject;
      description = des;
      finalSchema = rest;
    } else {
      finalSchema = schemaObject;
    }
    return {
      name: schemaKey,
      in: isPathParameter ? 'path' : 'query',
      required: isPathParameter ? !knownParameters[schemaKey].optional : isSubSchemaRequired,
      schema: finalSchema,
      description,
    };
  });
};

export const convertQuery = (kbnConfigSchema: unknown) => {
  const schema = unwrapKbnConfigSchema(kbnConfigSchema);
  const ctx = createCtx({ refs: false }); // For now context is not shared between body, params and queries
  const result = convertObjectMembersToParameterObjects(ctx, schema, {}, false);
  return {
    query: result,
    shared: Object.fromEntries(ctx.sharedSchemas.entries()),
  };
};

export const convertPathParameters = (
  kbnConfigSchema: unknown,
  knownParameters: { [paramName: string]: { optional: boolean } }
) => {
  const schema = unwrapKbnConfigSchema(kbnConfigSchema);
  if (!isObjectType(schema) && !isNullableObjectType(schema)) {
    throw createError('Input parser for path params expected to be an object schema');
  }
  const ctx = createCtx(); // For now context is not shared between body, params and queries
  const result = convertObjectMembersToParameterObjects(ctx, schema, knownParameters, true);
  return {
    params: result,
    shared: Object.fromEntries(ctx.sharedSchemas.entries()),
  };
};

export const is = (schema: unknown): boolean => {
  if (isConfigSchema(schema)) {
    const description = schema.getSchema().describe();
    // We ignore "any" @kbn/config-schema for the purposes of OAS generation...
    if (
      (description.type === 'any' && !('allow' in description)) ||
      isEmptyObjectAllowsUnknowns(description)
    ) {
      return false;
    }
    return true;
  }
  return false;
};
