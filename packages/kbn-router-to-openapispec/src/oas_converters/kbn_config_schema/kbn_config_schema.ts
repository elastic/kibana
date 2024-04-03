/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import joi from 'joi';
import { isConfigSchema, Type } from '@kbn/config-schema';
import { get } from 'lodash';
import type { OpenAPIV3 } from 'openapi-types';
import type { KnownParameters, OpenAPIConverter } from '../../type';
import { isReferenceObject } from '../common';
import * as mutations from './post_process_mutations';
import { parse } from './parse';

const isObjectType = (schema: joi.Schema | joi.Description): boolean => {
  return schema.type === 'object';
};

const isRecordType = (schema: joi.Schema | joi.Description): boolean => {
  return schema.type === 'record';
};

// See the `schema.nullable` type in @kbn/config-schema
// TODO: we need to generate better OAS for Kibana config schema nullable type
const isNullableObjectType = (schema: joi.Schema | joi.Description): boolean => {
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

const createError = (message: string): Error => {
  return new Error(`[@kbn/config-schema converter] ${message}`);
};

function assertInstanceOfKbnConfigSchema(schema: unknown): asserts schema is Type<any> {
  if (!is(schema)) {
    throw createError('Expected schema to be an instance of @kbn/config-schema');
  }
}

const unwrapKbnConfigSchema = (schema: unknown): joi.Schema => {
  assertInstanceOfKbnConfigSchema(schema);
  return schema.getSchema();
};

const isSchemaRequired = (schema: joi.Schema | joi.Description): boolean => {
  if (joi.isSchema(schema)) {
    return schema._flags?.presence === 'required';
  }
  return 'required' === get(schema, 'flags.presence');
};

const arrayContainers: Array<keyof OpenAPIV3.SchemaObject> = ['allOf', 'oneOf', 'anyOf'];

const walkSchema = (schema: OpenAPIV3.SchemaObject): void => {
  mutations.processAny(schema);
  if (schema.type === 'array') {
    walkSchema(schema.items as OpenAPIV3.SchemaObject);
  } else if (schema.type === 'object') {
    mutations.processObject(schema);
    if (schema.properties) {
      Object.values(schema.properties!).forEach((obj) => walkSchema(obj as OpenAPIV3.SchemaObject));
    }
  } else if ((schema.type as string) === 'record') {
    mutations.processRecord(schema);
  } else if ((schema.type as string) === 'map') {
    mutations.processMap(schema);
  } else if (schema.type === 'string') {
    mutations.processString(schema);
  } else if (schema.type) {
    // Do nothing
  } else {
    for (const arrayContainer of arrayContainers) {
      if (schema[arrayContainer]) {
        schema[arrayContainer].forEach(walkSchema);
        break;
      }
    }
  }
};

export const postProcessMutations = (oasSchema: OpenAPIV3.SchemaObject) => {
  if (!oasSchema) return;
  walkSchema(oasSchema);
};

const convert = (kbnConfigSchema: unknown): OpenAPIV3.BaseSchemaObject => {
  const schema = unwrapKbnConfigSchema(kbnConfigSchema);
  return parse(schema) as OpenAPIV3.SchemaObject;
};

const convertObjectMembersToParameterObjects = (
  schema: joi.Schema,
  knownParameters: KnownParameters = {},
  isPathParameter = false
): OpenAPIV3.ParameterObject[] => {
  let properties: Exclude<OpenAPIV3.SchemaObject['properties'], undefined>;
  if (isNullableObjectType(schema)) {
    const { anyOf }: { anyOf: OpenAPIV3.SchemaObject[] } = parse(schema);
    properties = anyOf.find((s) => s.type === 'object')!.properties!;
  } else if (isObjectType(schema)) {
    ({ properties } = parse(schema));
  } else if (isRecordType(schema)) {
    return [];
  } else {
    throw createError(`Expected record, object or nullable object type, but got '${schema.type}'`);
  }

  return Object.entries(properties).map(([schemaKey, schemaObject]) => {
    const isSubSchemaRequired = isSchemaRequired(schemaObject);
    if (isReferenceObject(schemaObject)) {
      throw createError(
        `Expected schema but got reference object: ${JSON.stringify(schemaObject, null, 2)}`
      );
    }
    const { description, ...openApiSchemaObject } = schemaObject;
    if (!knownParameters[schemaKey] && isPathParameter) {
      throw createError(`Unknown parameter: ${schemaKey}, are you sure this is in your path?`);
    }
    return {
      name: schemaKey,
      in: isPathParameter ? 'path' : 'query',
      required: isPathParameter ? !knownParameters[schemaKey].optional : isSubSchemaRequired,
      schema: openApiSchemaObject,
      description,
    };
  });
};

const convertQuery = (kbnConfigSchema: unknown): OpenAPIV3.ParameterObject[] => {
  const schema = unwrapKbnConfigSchema(kbnConfigSchema);
  return convertObjectMembersToParameterObjects(schema, {}, false);
};

const convertPathParameters = (
  kbnConfigSchema: unknown,
  knownParameters: { [paramName: string]: { optional: boolean } }
): OpenAPIV3.ParameterObject[] => {
  const schema = unwrapKbnConfigSchema(kbnConfigSchema);

  if (isObjectType(schema)) {
    // TODO: Revisit this validation logic
    // const schemaDescription = schema.describe();
    // const schemaKeys = Object.keys(schemaDescription.keys);
    // validatePathParameters(pathParameters, schemaKeys);
  } else if (isNullableObjectType(schema)) {
    // nothing to do for now...
  } else {
    throw createError('Input parser for path params expected to be an object schema');
  }

  return convertObjectMembersToParameterObjects(schema, knownParameters, true);
};

const is = (schema: unknown): boolean => {
  if (isConfigSchema(schema)) {
    const description = schema.getSchema().describe();
    // We ignore "any" @kbn/config-schema for the purposes of OAS generation...
    if (
      description.type === 'any' ||
      (!isSchemaRequired(description) && isEmptyObjectAllowsUnknowns(description))
    ) {
      return false;
    }
    return true;
  }
  return false;
};

export const kbnConfigSchemaConverter: OpenAPIConverter = {
  convertQuery,
  convertPathParameters,
  convert,
  is,
};
