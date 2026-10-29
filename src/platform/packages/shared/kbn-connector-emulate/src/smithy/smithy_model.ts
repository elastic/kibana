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
  /** Shapes whose members and traits the shape includes. */
  readonly mixins?: readonly ShapeRef[];
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
  if (shape) {
    return shape.mixins?.length ? withMixins(model, shape) : shape;
  }
  if (!id.startsWith(PRELUDE)) {
    return undefined;
  }
  const type = PRELUDE_TYPES[shapeName(id).replace(/^Primitive/, '')];
  return type ? { type, ...(type === 'structure' ? { members: {} } : {}) } : undefined;
};

// Members by name, later layers over earlier ones. A member that overrides one adds its traits
// to those it inherits (https://smithy.io/2.0/spec/mixins.html#mixin-member-traits).
const mergeMembers = (
  layers: ReadonlyArray<Record<string, MemberShape> | undefined>
): Record<string, MemberShape> => {
  const merged: Record<string, MemberShape> = {};
  for (const members of layers) {
    for (const [name, member] of Object.entries(members ?? {})) {
      const inherited = merged[name];
      merged[name] = inherited
        ? { ...member, traits: { ...inherited.traits, ...member.traits } }
        : member;
    }
  }
  return merged;
};

// A shape with the members and traits of its mixins, which the JSON AST lists only on the
// mixins; the shape's own come last and win.
const withMixins = (model: SmithyModel, shape: Shape): Shape => {
  const mixins = (shape.mixins ?? []).flatMap(({ target }) => getShape(model, target) ?? []);
  const traits = Object.assign(
    {},
    ...mixins.map(({ traits: mixinTraits = {} }) => {
      const { 'smithy.api#mixin': _, ...rest } = mixinTraits;
      return rest;
    }),
    shape.traits
  );
  return {
    ...shape,
    traits,
    ...(shape.members || mixins.some(({ members }) => members)
      ? { members: mergeMembers([...mixins.map(({ members }) => members), shape.members]) }
      : {}),
  };
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

/** The members of a structure, by name; none for `smithy.api#Unit`. */
export const membersOf = (
  model: SmithyModel,
  target: string | undefined
): Array<[string, MemberShape]> =>
  target && target !== UNIT ? Object.entries(getShape(model, target)?.members ?? {}) : [];

export const documentationOf = (shape: { readonly traits?: Traits }) => {
  const documentation = shape.traits?.['smithy.api#documentation'];
  return typeof documentation === 'string' ? { description: documentation } : {};
};

/** The status of an error shape: its `@httpError`, or 400 for client and 500 for server errors. */
export const errorStatus = (shape: Shape | undefined): string => {
  const code = shape?.traits?.['smithy.api#httpError'];
  if (typeof code === 'number') {
    return String(code);
  }
  return shape?.traits?.['smithy.api#error'] === 'server' ? '500' : '400';
};

/** The service to convert: the one with this ID, or the model's only service. */
export const pickService = (model: SmithyModel, id?: string): [string, Shape] => {
  const services = findServices(model);
  const service = id ? services.find(([serviceId]) => serviceId === id) : services[0];
  if (!service || (!id && services.length > 1)) {
    throw new Error(
      id
        ? `The model has no service ${id}`
        : `Expected one service in the model, found ${
            services.map(([serviceId]) => serviceId).join(', ') || 'none'
          }; pass the service to convert`
    );
  }
  return service;
};

/** The AWS protocol traits of a service, such as `aws.protocols#restJson1`. */
export const protocolsOf = (service: Shape): string[] =>
  Object.keys(service.traits ?? {}).filter((trait) => trait.startsWith('aws.protocols#'));

const SIGV4 = 'aws.auth#sigv4';
// The scheme name and shape smithy-openapi uses for SigV4.
const SIGV4_SCHEME = 'aws.auth.sigv4';

/** The prefix of the service's regional hosts, such as `monitoring`. */
export const endpointPrefixOf = (serviceId: string, service: Shape): string => {
  const awsService = traitRecord(service.traits, 'aws.api#service');
  const sigv4 = traitRecord(service.traits, SIGV4);
  return String(awsService?.endpointPrefix ?? sigv4?.name ?? shapeName(serviceId).toLowerCase());
};

/** The service's regional endpoint, with the region as a server variable. */
export const regionalServers = (endpointPrefix: string) => [
  {
    url: `https://${endpointPrefix}.{region}.amazonaws.com`,
    variables: { region: { default: 'us-east-1' } },
  },
];

/** SigV4 as an `Authorization` header requirement, for services that use it. */
export const sigv4SecuritySchemes = (service: Shape) =>
  hasTrait(service.traits, SIGV4)
    ? {
        securitySchemes: {
          [SIGV4_SCHEME]: {
            type: 'apiKey',
            description: 'AWS Signature Version 4 authentication',
            name: 'Authorization',
            in: 'header',
            'x-amazon-apigateway-authtype': 'awsSigv4',
          },
        },
      }
    : {};

export const sigv4Security = (service: Shape) =>
  hasTrait(service.traits, SIGV4) ? { security: [{ [SIGV4_SCHEME]: [] }] } : {};
