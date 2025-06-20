/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/* eslint-disable no-bitwise */

import { OpenAPIV3_1 } from 'openapi-types';
import { SymbolFlags, Type, TypeChecker, TypeFlags, TypeReference } from 'typescript';

export function extractSchemaFromType({
  type,
  checker,
  includeRequired,
  seen,
  depth = 0,
  debugValue,
}: {
  type: Type;
  checker: TypeChecker;
  includeRequired: boolean;
  seen: Map<number, number>;
  depth: number;
  debugValue?: string;
}): OpenAPIV3_1.SchemaObject {
  // Detect and prevent real recursion
  const typeId = (type as any).id;

  if (typeId !== undefined) {
    const seenDepth = seen.get(typeId);
    if (seenDepth !== undefined && seenDepth <= depth) {
      return {}; // true recursion — stop here
    }

    seen.set(typeId, depth);
  }

  // Handle unions of string literals
  if (type.isUnion()) {
    // Enum values
    if (type.types.every((t) => t.isLiteral() && t.flags & TypeFlags.StringLiteral)) {
      const enumValues = type.types.map((t) => checker.typeToString(t).replace(/^"|"$/g, ''));
      return { type: 'string', enum: enumValues };
    }

    // Concise union types
    if (
      type.types.length === 2 &&
      (type.types.find((t) => t.flags & TypeFlags.StringLike) ||
        type.types.find((t) => t.flags & TypeFlags.NumberLike)) &&
      type.types.find((t) => (t.flags & TypeFlags.Null) !== 0)
    ) {
      return {
        type: ['string', 'null'],
      };
    }

    return {
      oneOf: type.types.map((t) =>
        extractSchemaFromType({
          type: t,
          checker,
          includeRequired,
          seen: new Map(seen),
          debugValue,
          depth: depth + 1,
        })
      ),
    };
  }

  if (type.isIntersection()) {
    return {
      allOf: type.types.map((t) =>
        extractSchemaFromType({
          type: t,
          checker,
          includeRequired,
          seen: new Map(seen),
          debugValue,
          depth: depth + 1,
        })
      ),
    };
  }

  if (type.flags & TypeFlags.StringLike) return { type: 'string' };
  if (type.flags & TypeFlags.NumberLike) return { type: 'number' };
  if (type.flags & TypeFlags.BooleanLike) return { type: 'boolean' };
  if (type.flags & TypeFlags.Null) return { type: 'null' };
  if (type.flags & TypeFlags.Undefined) return { type: 'null' };
  if (type.flags & TypeFlags.Any || type.flags & TypeFlags.Unknown) return {};

  if (checker.isArrayType(type)) {
    const typeArgs = (type as TypeReference).typeArguments;
    const elementType = typeArgs?.[0] ?? checker.getAnyType();
    return {
      type: 'array',
      items: extractSchemaFromType({
        type: elementType,
        checker,
        includeRequired,
        seen: new Map(seen),
        debugValue,
        depth: depth + 1,
      }),
    };
  }

  if (type.getProperties) {
    const properties: Record<string, any> = {};
    const required: string[] = [];

    for (const prop of type.getProperties()) {
      const decl = prop.valueDeclaration || prop.declarations?.[0];

      const propType = decl
        ? checker.getTypeOfSymbolAtLocation(prop, decl)
        : checker.getTypeOfSymbol(prop);

      if (checker.typeToString(propType) === 'unknown') {
        continue; // Skip unknown types
      }

      // Handle special case for JSON types
      if (checker.typeToString(propType) === 'Json') {
        properties[prop.name] = {
          type: 'object',
          additionalProperties: true,
        };

        continue;
      }

      properties[prop.name] = extractSchemaFromType({
        type: propType,
        checker,
        includeRequired,
        seen: new Map(seen),
        debugValue: prop.name,
        depth: depth + 1,
      });

      if (includeRequired && !(prop.flags & SymbolFlags.Optional)) {
        required.push(prop.name);
      }
    }

    return {
      type: 'object',
      ...(Object.keys(properties).length ? { properties } : {}),
      ...(required.length ? { required } : {}),
    };
  }

  return {};
}
