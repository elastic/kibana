/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { isRecord } from '../openapi/schema_walk';

/** A trait's value, keyed by its shape ID, e.g. `smithy.api#required`. */
export type Traits = Readonly<Record<string, unknown>>;

export interface ShapeRef {
  readonly target: string;
}

export interface MemberShape extends ShapeRef {
  readonly traits?: Traits;
}

/** A shape in Smithy's JSON AST (https://smithy.io/2.0/spec/json-ast.html). */
export interface Shape {
  readonly type: string;
  readonly traits?: Traits;
  /** Structures, unions, enums and intEnums. */
  readonly members?: Readonly<Record<string, MemberShape>>;
  /** Lists and sets. */
  readonly member?: MemberShape;
  /** Maps. */
  readonly key?: MemberShape;
  readonly value?: MemberShape;
  /** Operations. */
  readonly input?: ShapeRef;
  readonly output?: ShapeRef;
  readonly errors?: readonly ShapeRef[];
  /** Services and resources. */
  readonly version?: string;
  readonly operations?: readonly ShapeRef[];
  readonly resources?: readonly ShapeRef[];
  readonly collectionOperations?: readonly ShapeRef[];
  readonly create?: ShapeRef;
  readonly put?: ShapeRef;
  readonly read?: ShapeRef;
  readonly update?: ShapeRef;
  readonly delete?: ShapeRef;
  readonly list?: ShapeRef;
}

export interface SmithyModel {
  readonly smithy: string;
  readonly shapes: Readonly<Record<string, Shape>>;
}

/** Whether a parsed document is a Smithy model in the JSON AST, as AWS publishes them. */
export const isSmithyModel = (document: unknown): document is SmithyModel =>
  isRecord(document) &&
  typeof document.smithy === 'string' &&
  isRecord(document.shapes) &&
  Object.values(document.shapes).every(
    (shape) => isRecord(shape) && typeof shape.type === 'string'
  );

/** The shape's name without its namespace: `com.amazonaws.eks#Cluster` becomes `Cluster`. */
export const shapeName = (id: string): string => id.slice(id.indexOf('#') + 1);

const PRELUDE = 'smithy.api#';

// Prelude shapes (https://smithy.io/2.0/spec/model.html#prelude) aren't listed in the model.
const PRELUDE_TYPES: Readonly<Record<string, string>> = {
  String: 'string',
  Blob: 'blob',
  BigInteger: 'bigInteger',
  BigDecimal: 'bigDecimal',
  Timestamp: 'timestamp',
  Document: 'document',
  Boolean: 'boolean',
  Byte: 'byte',
  Short: 'short',
  Integer: 'integer',
  Long: 'long',
  Float: 'float',
  Double: 'double',
  Unit: 'structure',
};

/** Looks up a shape, including prelude shapes such as `smithy.api#String`. */
export const getShape = (model: SmithyModel, id: string): Shape | undefined => {
  const shape = model.shapes[id];
  if (shape || !id.startsWith(PRELUDE)) {
    return shape;
  }
  const type = PRELUDE_TYPES[shapeName(id).replace(/^Primitive/, '')];
  return type ? { type, ...(type === 'structure' ? { members: {} } : {}) } : undefined;
};

export const UNIT = `${PRELUDE}Unit`;

/** The service shapes of a model, by ID. */
export const findServices = (model: SmithyModel): Array<[string, Shape]> =>
  Object.entries(model.shapes).filter(([, shape]) => shape.type === 'service');

const RESOURCE_LIFECYCLE = ['create', 'put', 'read', 'update', 'delete', 'list'] as const;

/**
 * The operations of a service, bound directly or through its resources and their child
 * resources (https://smithy.io/2.0/spec/service-types.html), by ID and without duplicates.
 */
export const collectOperations = (model: SmithyModel, serviceId: string): string[] => {
  const operations = new Set<string>();
  const seen = new Set<string>();
  const visit = (id: string) => {
    const shape = model.shapes[id];
    if (!shape || seen.has(id)) {
      return;
    }
    seen.add(id);
    for (const ref of [
      ...(shape.operations ?? []),
      ...(shape.collectionOperations ?? []),
      ...RESOURCE_LIFECYCLE.flatMap((name) => shape[name] ?? []),
    ]) {
      operations.add(ref.target);
    }
    for (const { target } of shape.resources ?? []) {
      visit(target);
    }
  };
  visit(serviceId);
  return [...operations];
};

/** A trait's value as a record, or undefined when the shape doesn't have it. */
export const traitRecord = (
  traits: Traits | undefined,
  id: string
): Record<string, unknown> | undefined => {
  const value = traits?.[id];
  return isRecord(value) ? value : undefined;
};

export const hasTrait = (traits: Traits | undefined, id: string): boolean =>
  traits !== undefined && id in traits;
