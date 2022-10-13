/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { Type, Node } from 'ts-morph';
import { TypeKind } from '../types';

export function getTypeKind(node: Node): TypeKind {
  if (Node.isIndexSignatureDeclaration(node)) {
    return TypeKind.IndexSignature;
  } else if (Node.isConstructorDeclaration(node)) {
    // For some reason constructors come back as Any type.
    return TypeKind.FunctionKind;
  } else if (Node.isTypeAliasDeclaration(node)) {
    return TypeKind.TypeKind;
  } else {
    return getTypeKindForType(node.getType());
  }
}

function getTypeKindForType(type: Type): TypeKind {
  // I think a string literal is also a string... but just in case, checking both.
  if (type.isString() || type.isStringLiteral()) {
    return TypeKind.StringKind;
  } else if (type.isNumber() || type.isNumberLiteral()) {
    return TypeKind.NumberKind;

    // I could be wrong about this logic. Does this existance of a call signature mean it's a function?
  } else if (type.getCallSignatures().length > 0) {
    return TypeKind.FunctionKind;
  } else if (type.isArray()) {
    // Arrays are also objects, check this first.
    return TypeKind.ArrayKind;
  } else if (type.isObject()) {
    return TypeKind.ObjectKind;
  } else if (type.isBoolean() || type.isBooleanLiteral()) {
    return TypeKind.BooleanKind;
  } else if (type.isEnum() || type.isEnumLiteral()) {
    return TypeKind.EnumKind;
  } else if (type.isUnion()) {
    // Special handling for "type | undefined" which happens alot and should be represented in docs as
    // "type", but with an "optional" flag.  Anything more complicated will just be returned as a
    // "CompoundType".
    if (getIsTypeOptional(type) && type.getUnionTypes().length === 2) {
      const otherType = type.getUnionTypes().find((u) => u.isUndefined() === false);
      if (otherType) {
        return getTypeKindForType(otherType);
      }
    }
  } else if (type.isAny()) {
    return TypeKind.AnyKind;
  } else if (type.isUnknown()) {
    return TypeKind.UnknownKind;
  }

  if (type.isUnionOrIntersection()) {
    return TypeKind.CompoundTypeKind;
  }

  return TypeKind.Uncategorized;
}

function getIsTypeOptional(type: Type): boolean {
  if (type.isUnion()) {
    const unions = type.getUnionTypes();
    return unions.find((u) => u.isUndefined()) !== undefined;
  } else {
    return false;
  }
}
