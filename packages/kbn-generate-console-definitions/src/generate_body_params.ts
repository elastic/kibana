/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { SpecificationTypes } from './types';
import { findTypeDefinition } from './helpers';

interface OneOf {
  __one_of: string[];
}
interface AnyOf {
  __any_of: string[];
}

type BodyParamValue = string | BodyParamValue[] | OneOf | AnyOf | Record<string, unknown>;

const oneOf = (values: string[]): OneOf => ({ __one_of: values });
const anyOf = (values: string[]): AnyOf => ({ __any_of: values });
const isOneOf = (v: BodyParamValue): v is OneOf => typeof v === 'object' && '__one_of' in v;
const isAnyOf = (v: BodyParamValue): v is AnyOf => typeof v === 'object' && '__any_of' in v;
const isObjectValue = (v: BodyParamValue): v is Record<string, unknown> =>
  typeof v === 'object' && !Array.isArray(v) && !isOneOf(v) && !isAnyOf(v);

/**
 * Generates data_autocomplete_rules for body properties, recursing into interface types.
 * Cycle detection via a visited set prevents infinite recursion on self-referencing types.
 * Single-select values use { __one_of: [...] }, multi-select use { __any_of: [...] }.
 * Dictionaries are represented as {}.
 */
export const generateBodyParams = (
  requestType: SpecificationTypes.Request,
  schema: SpecificationTypes.Model
): Record<string, unknown> => {
  const { body } = requestType;
  if (body.kind !== 'properties') {
    return {};
  }
  return convertProperties(body.properties, schema, new Set());
};

const convertProperties = (
  properties: SpecificationTypes.Property[],
  schema: SpecificationTypes.Model,
  visited: Set<string>
): Record<string, unknown> => {
  const result: Record<string, unknown> = {};
  for (const property of properties) {
    const { name, serverDefault, type } = property;
    const converted = convertBodyValueOf(type, serverDefault, schema, visited);
    result[name] = converted;
  }
  return result;
};

const convertBodyValueOf = (
  valueOf: SpecificationTypes.ValueOf,
  serverDefault: SpecificationTypes.Property['serverDefault'],
  schema: SpecificationTypes.Model,
  visited: Set<string>
): BodyParamValue => {
  const { kind } = valueOf;
  if (kind === 'instance_of') {
    const { type: typeName } = valueOf as SpecificationTypes.InstanceOf;
    const { name: propertyName, namespace } = typeName;

    if (namespace === '_builtins') {
      return propertyName === 'boolean' ? '__flag__' : '';
    }

    const definedType = findTypeDefinition(schema, typeName);
    if (!definedType) return '';

    if (definedType.kind === 'enum') {
      return oneOf((definedType as SpecificationTypes.Enum).members.map((m) => m.name));
    } else if (definedType.kind === 'type_alias') {
      return convertBodyValueOf(
        (definedType as SpecificationTypes.TypeAlias).type,
        serverDefault,
        schema,
        visited
      );
    } else if (definedType.kind === 'interface') {
      const typeKey = `${namespace}::${propertyName}`;
      if (visited.has(typeKey)) return {}; // cycle guard
      visited.add(typeKey);
      const nested = convertProperties(
        (definedType as SpecificationTypes.Interface).properties,
        schema,
        visited
      );
      visited.delete(typeKey); // backtrack so the same type can appear in other branches
      return nested;
    }
    // request, response — represent as empty object
    return {};
  } else if (kind === 'array_of') {
    const inner = convertBodyValueOf(
      (valueOf as SpecificationTypes.ArrayOf).value,
      serverDefault,
      schema,
      visited
    );
    if (isOneOf(inner)) return anyOf(inner.__one_of); // __one_of inside an array means multiple values can be selected
    if (inner === '') return []; // scalar string array — wrap in array to signal the field accepts multiple values
    return [inner];
  } else if (kind === 'union_of') {
    const converted = (valueOf as SpecificationTypes.UnionOf).items.map(
      (item) => convertBodyValueOf(item, serverDefault, schema, visited)
    );
    if (converted.some((v) => v === undefined || v === '')) return ''; // open-ended string makes the whole union open-ended
    const defined = converted as BodyParamValue[];
    const objectValue = defined.find(isObjectValue); // take first object branch (e.g. boolean | SourceFilter → SourceFilter shape)
    if (objectValue !== undefined) return objectValue; // object branch takes priority — it subsumes booleans and scalars
    const allValues = defined.flatMap((v) => {
      if (isOneOf(v)) return v.__one_of;
      if (typeof v === 'string' && v !== '__flag__') return [v];
      return [];
    });
    if (allValues.length > 0) return oneOf(allValues);
    if (defined.some((v) => v === '__flag__')) return '__flag__';
    return '';
  } else if (kind === 'literal_value') {
    return valueOf.value.toString();
  } else if (kind === 'dictionary_of') {
    return {};
  }

  // user_defined_value — skip
  return '';
};
