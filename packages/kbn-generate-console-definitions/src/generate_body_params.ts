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

type Primitive = string | number | boolean;
const UNSUPPORTED = Symbol('unsupported');

interface OneOf {
  __one_of: Primitive[];
}
interface AnyOf {
  __any_of: Primitive[];
}

type BodyParamValue = Primitive | BodyParamValue[] | OneOf | AnyOf | Record<string, unknown>;
type ConversionResult = BodyParamValue | typeof UNSUPPORTED;

interface ConversionContext {
  schema: SpecificationTypes.Model;
  genericBindings: ReadonlyMap<string, SpecificationTypes.ValueOf>;
  visitedTypes: ReadonlySet<string>;
}

const oneOf = (values: Primitive[]): OneOf => ({ __one_of: values });
const anyOf = (values: Primitive[]): AnyOf => ({ __any_of: values });
const isOneOf = (value: ConversionResult): value is OneOf =>
  typeof value === 'object' && value !== null && '__one_of' in value;
const isAnyOf = (value: ConversionResult): value is AnyOf =>
  typeof value === 'object' && value !== null && '__any_of' in value;
const isObjectValue = (value: ConversionResult): value is Record<string, unknown> =>
  typeof value === 'object' &&
  value !== null &&
  !Array.isArray(value) &&
  !isOneOf(value) &&
  !isAnyOf(value);
const typeKey = ({ namespace, name }: SpecificationTypes.TypeName): string =>
  `${namespace}::${name}`;
const isSameType = (
  first: SpecificationTypes.TypeName,
  second: SpecificationTypes.TypeName
): boolean => first.name === second.name && first.namespace === second.namespace;

/**
 * Generates the subset of request-body rules that Console's object rule language can express.
 */
export const generateBodyParams = (
  requestType: SpecificationTypes.Request,
  schema: SpecificationTypes.Model
): Record<string, unknown> => {
  const { body } = requestType;
  const context: ConversionContext = {
    schema,
    genericBindings: new Map(),
    visitedTypes: new Set(),
  };
  if (body.kind === 'properties') {
    return convertProperties(body.properties, context);
  }
  if (body.kind === 'value') {
    const converted = convertBodyValueOf(body.value, context);
    return isObjectValue(converted) ? converted : {};
  }
  return {};
};

const convertProperties = (
  properties: SpecificationTypes.Property[],
  context: ConversionContext
): Record<string, unknown> => {
  const result: Record<string, unknown> = {};
  for (const property of properties) {
    const { name, type } = property;
    const converted = convertBodyValueOf(type, context);
    result[name] = converted === UNSUPPORTED ? '' : converted;
  }
  return result;
};

const resolveGenericValue = (
  valueOf: SpecificationTypes.ValueOf,
  bindings: ReadonlyMap<string, SpecificationTypes.ValueOf>,
  resolving = new Set<string>()
): SpecificationTypes.ValueOf => {
  if (valueOf.kind === 'instance_of') {
    const key = typeKey(valueOf.type);
    const boundValue = bindings.get(key);
    if (boundValue && !resolving.has(key)) {
      return resolveGenericValue(boundValue, bindings, new Set(resolving).add(key));
    }
    return {
      ...valueOf,
      generics: valueOf.generics?.map((generic) =>
        resolveGenericValue(generic, bindings, resolving)
      ),
    };
  }
  if (valueOf.kind === 'array_of') {
    return { ...valueOf, value: resolveGenericValue(valueOf.value, bindings, resolving) };
  }
  if (valueOf.kind === 'union_of') {
    return {
      ...valueOf,
      items: valueOf.items.map((item) => resolveGenericValue(item, bindings, resolving)),
    };
  }
  if (valueOf.kind === 'dictionary_of') {
    return {
      ...valueOf,
      key: resolveGenericValue(valueOf.key, bindings, resolving),
      value: resolveGenericValue(valueOf.value, bindings, resolving),
    };
  }
  return valueOf;
};

const bindGenerics = (
  parameters: SpecificationTypes.TypeName[] | undefined,
  argumentsToBind: SpecificationTypes.ValueOf[] | undefined,
  context: ConversionContext
): ReadonlyMap<string, SpecificationTypes.ValueOf> => {
  if (!parameters?.length || !argumentsToBind?.length) {
    return context.genericBindings;
  }
  const bindings = new Map(context.genericBindings);
  parameters.forEach((parameter, index) => {
    const argument = argumentsToBind[index];
    if (argument) {
      bindings.set(typeKey(parameter), resolveGenericValue(argument, context.genericBindings));
    }
  });
  return bindings;
};

const convertInterface = (
  definedType: SpecificationTypes.Interface,
  typeName: SpecificationTypes.TypeName,
  context: ConversionContext
): Record<string, unknown> => {
  if (typeName.name === 'QueryContainer' && typeName.namespace === '_types.query_dsl') {
    return { __scope_link: 'GLOBAL.query' };
  }
  const inherited = definedType.inherits
    ? convertInstanceOf(
        {
          kind: 'instance_of',
          type: definedType.inherits.type,
          generics: definedType.inherits.generics,
        },
        context
      )
    : {};
  return {
    ...(isObjectValue(inherited) ? inherited : {}),
    ...convertProperties(definedType.properties, context),
  };
};

const convertInstanceOf = (
  valueOf: SpecificationTypes.InstanceOf,
  context: ConversionContext
): ConversionResult => {
  const boundValue = context.genericBindings.get(typeKey(valueOf.type));
  if (
    boundValue &&
    !(boundValue.kind === 'instance_of' && isSameType(boundValue.type, valueOf.type))
  ) {
    return convertBodyValueOf(boundValue, context);
  }
  if (valueOf.type.namespace === '_builtins') {
    return valueOf.type.name === 'boolean' ? oneOf([true, false]) : '';
  }

  const definedType = findTypeDefinition(context.schema, valueOf.type);
  if (!definedType) {
    return UNSUPPORTED;
  }
  if (definedType.kind === 'enum') {
    return oneOf(definedType.members.map(({ name }) => name));
  }

  const key = typeKey(valueOf.type);
  if (context.visitedTypes.has(key)) {
    return {};
  }
  const nestedContext: ConversionContext = {
    ...context,
    genericBindings: bindGenerics(definedType.generics, valueOf.generics, context),
    visitedTypes: new Set(context.visitedTypes).add(key),
  };
  if (definedType.kind === 'type_alias') {
    return convertBodyValueOf(definedType.type, nestedContext);
  }
  if (definedType.kind === 'interface') {
    return convertInterface(definedType, valueOf.type, nestedContext);
  }
  return {};
};

const intersectObjectValues = (values: Array<Record<string, unknown>>): Record<string, unknown> => {
  const [first, ...rest] = values;
  return Object.fromEntries(
    Object.entries(first).filter(([key, value]) =>
      rest.every(
        (candidate) =>
          Object.hasOwn(candidate, key) && JSON.stringify(candidate[key]) === JSON.stringify(value)
      )
    )
  );
};

const uniqueValues = <T extends BodyParamValue>(values: T[]): T[] => {
  const seen = new Set<string>();
  return values.filter((value) => {
    const serialized = JSON.stringify(value);
    if (seen.has(serialized)) {
      return false;
    }
    seen.add(serialized);
    return true;
  });
};

const convertUnion = (
  { items }: SpecificationTypes.UnionOf,
  context: ConversionContext
): BodyParamValue => {
  const converted = items.map((item) => convertBodyValueOf(item, context));
  if (converted.some((value) => value === UNSUPPORTED || value === '')) {
    return '';
  }

  const objectValues = uniqueValues(converted.filter(isObjectValue));
  if (objectValues.length === 1) {
    return objectValues[0];
  }
  if (objectValues.length > 1) {
    return intersectObjectValues(objectValues);
  }

  const choices = uniqueValues(
    converted.flatMap((value): Primitive[] => {
      if (isOneOf(value)) {
        return value.__one_of;
      }
      return typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean'
        ? [value]
        : [];
    })
  );
  if (choices.length > 0) {
    return oneOf(choices);
  }

  const arrayValues = uniqueValues(
    converted.filter((value) => Array.isArray(value) || isAnyOf(value))
  );
  if (arrayValues.length === 1) {
    return arrayValues[0];
  }
  return arrayValues.length > 1 ? [] : '';
};

const convertBodyValueOf = (
  valueOf: SpecificationTypes.ValueOf,
  context: ConversionContext
): ConversionResult => {
  if (valueOf.kind === 'instance_of') {
    return convertInstanceOf(valueOf, context);
  }
  if (valueOf.kind === 'array_of') {
    const inner = convertBodyValueOf(valueOf.value, context);
    if (isOneOf(inner)) {
      return anyOf(inner.__one_of);
    }
    if (inner === UNSUPPORTED || inner === '') {
      return [];
    }
    return [inner];
  }
  if (valueOf.kind === 'union_of') {
    return convertUnion(valueOf, context);
  }
  if (valueOf.kind === 'literal_value') {
    return valueOf.value;
  }
  if (valueOf.kind === 'dictionary_of') {
    const valueRule = convertBodyValueOf(valueOf.value, context);
    if (valueRule === UNSUPPORTED) {
      return {};
    }
    return { '*': valueRule };
  }
  return UNSUPPORTED;
};
