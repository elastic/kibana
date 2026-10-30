/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { isRecord } from '../openapi/schema_walk';
import type { JsonSchema } from '../openapi/types';
import type { MemberShape, Shape, SmithyModel, Traits } from './smithy_model';
import { getShape, hasTrait, shapeName, traitRecord } from './smithy_model';

/** Where a value is sent, which decides how timestamps and blobs are written. */
export type Location = 'body' | 'payload' | 'header' | 'query' | 'label';

// The default timestamp formats of HTTP bindings and of restJson1 documents
// (https://smithy.io/2.0/aws/protocols/aws-restjson1-protocol.html).
const DEFAULT_TIMESTAMP_FORMATS: Readonly<Record<Location, string>> = {
  body: 'epoch-seconds',
  payload: 'epoch-seconds',
  header: 'http-date',
  query: 'date-time',
  label: 'date-time',
};

const INTEGER_FORMATS: Readonly<Record<string, string>> = {
  byte: 'int32',
  short: 'int32',
  integer: 'int32',
  long: 'int64',
};

const NUMBER_FORMATS: Readonly<Record<string, string>> = { float: 'float', double: 'double' };

// Shapes that become components: they are named, may be recursive and are often reused.
const COMPONENT_TYPES = new Set(['structure', 'union', 'enum', 'intEnum']);

const toNumber = (value: unknown): number | undefined =>
  typeof value === 'number' && Number.isFinite(value) ? value : undefined;

/** A member's traits override those of the shape it targets. */
const mergeTraits = (shape: Shape, member?: Traits): Traits => ({
  ...shape.traits,
  ...member,
});

const timestampSchema = (format: unknown): JsonSchema => {
  switch (format) {
    case 'date-time':
      return { type: 'string', format: 'date-time' };
    case 'http-date':
      return { type: 'string' };
    default:
      // Epoch seconds, with fractions for milliseconds.
      return { type: 'number', format: 'double' };
  }
};

// The length of n bytes in padded base64. Lengths of 3k+1 and 3k+2 bytes share one encoded
// length, so a bound that isn't a multiple of 3 also admits the longer value of that length
// (`AAAA` for one byte). The bounds never reject a valid blob; telling the two apart takes a
// padding pattern, which overflows the regex stack on megabyte blobs.
const base64Length = (bytes: number): number => 4 * Math.ceil(bytes / 3);

/**
 * Applies `@length`, `@range`, `@pattern` and the legacy `@enum` trait to a schema. `@length`
 * counts a blob's bytes, so base64-encoded blobs get the lengths of their encodings.
 */
const withConstraints = (
  schema: JsonSchema,
  type: string,
  traits: Traits,
  base64: boolean
): JsonSchema => {
  const length = traitRecord(traits, 'smithy.api#length');
  const range = traitRecord(traits, 'smithy.api#range');
  const pattern = traits['smithy.api#pattern'];
  const legacyEnum = traits['smithy.api#enum'];
  const [min, max] =
    type === 'list' || type === 'set'
      ? ['minItems', 'maxItems']
      : type === 'map'
      ? ['minProperties', 'maxProperties']
      : ['minLength', 'maxLength'];
  const [minLength, maxLength] = [toNumber(length?.min), toNumber(length?.max)].map((bound) =>
    bound !== undefined && base64 ? base64Length(bound) : bound
  );
  return {
    ...schema,
    ...(minLength !== undefined ? { [min]: minLength } : {}),
    ...(maxLength !== undefined ? { [max]: maxLength } : {}),
    ...(range && toNumber(range.min) !== undefined ? { minimum: range.min } : {}),
    ...(range && toNumber(range.max) !== undefined ? { maximum: range.max } : {}),
    ...(typeof pattern === 'string' && type === 'string' ? { pattern } : {}),
    ...(Array.isArray(legacyEnum)
      ? {
          enum: legacyEnum.flatMap((entry: unknown) =>
            isRecord(entry) && typeof entry.value === 'string' ? [entry.value] : []
          ),
        }
      : {}),
  };
};

// `@sparse` collections may hold nulls. A `$ref` ignores its siblings, so a referenced shape
// is wrapped, keeping the component itself non-nullable.
const toNullable = (schema: JsonSchema): JsonSchema =>
  '$ref' in schema ? { allOf: [schema], nullable: true } : { ...schema, nullable: true };

/** The JSON name of a structure member in a document body (`@jsonName`). */
export const jsonName = (name: string, member: MemberShape): string => {
  const value = member.traits?.['smithy.api#jsonName'];
  return typeof value === 'string' ? value : name;
};

/** Whether a member is required, ignoring `@required` where `@clientOptional` relaxes it. */
export const isRequired = (member: MemberShape): boolean =>
  hasTrait(member.traits, 'smithy.api#required') &&
  !hasTrait(member.traits, 'smithy.api#clientOptional') &&
  // Senders may leave out members with a default, which receivers fill in.
  (member.traits?.['smithy.api#default'] === undefined ||
    member.traits['smithy.api#default'] === null);

/** The OpenAPI `xml` object of a schema, as the XML codec reads it. */
export interface XmlObject {
  readonly name?: string;
  readonly namespace?: string;
  readonly prefix?: string;
  readonly attribute?: boolean;
  readonly wrapped?: boolean;
}

/**
 * How a map is written in XML (OpenAPI's `xml` can't describe maps): entries of a key and a
 * value element, inside `entry` elements unless flattened.
 */
export interface XmlMap {
  readonly key: string;
  readonly value: string;
  readonly keyNamespace?: string;
  readonly valueNamespace?: string;
  readonly flattened?: boolean;
}

export const XML_MAP = 'x-smithy-xml-map';

export interface ShapeConverterOptions {
  /**
   * Describes documents as restXml writes them: OpenAPI `xml` objects for element names,
   * attributes, namespaces and list wrapping, `x-smithy-xml-map` for maps, and `date-time`
   * timestamps.
   */
  readonly xml?: boolean;
  /** Whether documents use `@jsonName`, as restJson1 does and awsJson and restXml don't. Defaults to true unless `xml`. */
  readonly jsonNames?: boolean;
  /**
   * Whether floats and doubles also take `"NaN"`, `"Infinity"` and `"-Infinity"`, as AWS's
   * protocols send them in documents, headers, query strings and labels.
   */
  readonly nonNumericFloats?: boolean;
}

export interface ShapeConverter {
  /** The schema of a shape where it is sent, given the traits of the member that targets it. */
  readonly toSchema: (target: string, location: Location, member?: Traits) => JsonSchema;
  /** The schema of a structure's members, as a JSON object. */
  readonly toObjectSchema: (members: ReadonlyArray<[string, MemberShape]>) => JsonSchema;
  /** Named shapes converted so far, as OpenAPI component schemas. */
  readonly components: Record<string, JsonSchema>;
}

export interface ShapeConverterOptions {
  /** Whether documents use `@jsonName`, as restJson1 does and awsJson doesn't. Defaults to true. */
  readonly jsonNames?: boolean;
  /**
   * Whether float and double members in documents also take `"NaN"`, `"Infinity"` and
   * `"-Infinity"`, as AWS's JSON protocols send them.
   */
  readonly nonNumericFloats?: boolean;
}

/** Converts Smithy shapes to OpenAPI 3.0 schemas, collecting named shapes as components. */
export const createShapeConverter = (
  model: SmithyModel,
  { xml = false, jsonNames = !xml, nonNumericFloats = false }: ShapeConverterOptions = {}
): ShapeConverter => {
  const components: Record<string, JsonSchema> = {};
  // restXml writes timestamps in documents as date-time strings.
  const timestampFormats = xml
    ? { ...DEFAULT_TIMESTAMP_FORMATS, body: 'date-time', payload: 'date-time' }
    : DEFAULT_TIMESTAMP_FORMATS;
  const nameOf = (name: string, member: MemberShape): string =>
    jsonNames ? jsonName(name, member) : name;

  // The namespace an `@xmlNamespace` trait gives an element.
  const namespaceOf = (traits: Traits | undefined): Partial<XmlObject> => {
    const namespace = traitRecord(traits, 'smithy.api#xmlNamespace');
    return typeof namespace?.uri === 'string'
      ? {
          namespace: namespace.uri,
          ...(typeof namespace.prefix === 'string' ? { prefix: namespace.prefix } : {}),
        }
      : {};
  };

  // Sets `xml` on a schema; a `$ref`'s siblings are ignored, so it is wrapped in `allOf`.
  const withXml = (schema: JsonSchema, object: Partial<XmlObject>): JsonSchema => {
    if (Object.keys(object).length === 0) {
      return schema;
    }
    if ('$ref' in schema) {
      return { allOf: [schema], xml: object };
    }
    return { ...schema, xml: { ...(isRecord(schema.xml) ? schema.xml : {}), ...object } };
  };

  // How a structure member is written: its element name, as an attribute, in a namespace,
  // and for lists and maps, whether the entries are flattened into the parent.
  const toXmlProperty = (name: string, member: MemberShape, schema: JsonSchema): JsonSchema => {
    const traits = member.traits ?? {};
    const xmlName = traits['smithy.api#xmlName'];
    const element = typeof xmlName === 'string' ? xmlName : name;
    const flattened = hasTrait(traits, 'smithy.api#xmlFlattened');
    const object: Partial<XmlObject> = {
      ...(element === name ? {} : { name: element }),
      ...(hasTrait(traits, 'smithy.api#xmlAttribute') ? { attribute: true } : {}),
      ...namespaceOf(traits),
    };
    if (schema.type === 'array' && isRecord(schema.items)) {
      // Flattened list entries are named after the member, not the list's member.
      const items = flattened ? withXml(schema.items, { name: element }) : schema.items;
      return { ...schema, items, xml: { ...object, wrapped: !flattened } };
    }
    if (isRecord(schema[XML_MAP])) {
      return withXml({ ...schema, [XML_MAP]: { ...schema[XML_MAP], flattened } }, object);
    }
    return withXml(schema, object);
  };

  const toObjectSchema = (members: ReadonlyArray<[string, MemberShape]>): JsonSchema => {
    const required = members.filter(([, member]) => isRequired(member));
    return {
      type: 'object',
      properties: Object.fromEntries(
        members.map(([name, member]) => {
          const schema = toSchema(member.target, 'body', member.traits);
          return [nameOf(name, member), xml ? toXmlProperty(name, member, schema) : schema];
        })
      ),
      ...(required.length > 0
        ? { required: required.map(([name, member]) => nameOf(name, member)) }
        : {}),
    };
  };

  const toComponent = (shape: Shape): JsonSchema => {
    const members = Object.entries(shape.members ?? {});
    switch (shape.type) {
      case 'enum':
      case 'intEnum':
        return {
          type: shape.type === 'enum' ? 'string' : 'integer',
          enum: members.map(([name, member]) => member.traits?.['smithy.api#enumValue'] ?? name),
        };
      case 'union':
        // A union is an object with exactly one of its members set.
        return {
          oneOf: members.map(([name, member]) => ({
            type: 'object',
            properties: {
              [nameOf(name, member)]: xml
                ? toXmlProperty(name, member, toSchema(member.target, 'body', member.traits))
                : toSchema(member.target, 'body', member.traits),
            },
            required: [nameOf(name, member)],
          })),
        };
      default:
        return toObjectSchema(members);
    }
  };

  const toSchema = (target: string, location: Location, member?: Traits): JsonSchema => {
    const shape = getShape(model, target);
    if (!shape) {
      return {};
    }
    const traits = mergeTraits(shape, member);
    const documentation = traits['smithy.api#documentation'];
    const annotations: JsonSchema = {
      ...(hasTrait(traits, 'smithy.api#deprecated') ? { deprecated: true } : {}),
      ...(traits['smithy.api#default'] !== undefined && traits['smithy.api#default'] !== null
        ? { default: traits['smithy.api#default'] }
        : {}),
    };

    if (COMPONENT_TYPES.has(shape.type)) {
      const name = shapeName(target);
      if (!(name in components)) {
        // Registered first, so recursive shapes refer to it instead of recursing.
        components[name] = {};
        const xmlName = shape.traits?.['smithy.api#xmlName'];
        components[name] = {
          ...toComponent(shape),
          ...(typeof shape.traits?.['smithy.api#documentation'] === 'string'
            ? { description: shape.traits['smithy.api#documentation'] }
            : {}),
          // The element name when the shape is a document's root, such as a payload.
          ...(xml && (shape.type === 'structure' || shape.type === 'union')
            ? {
                xml: {
                  name: typeof xmlName === 'string' ? xmlName : name,
                  ...namespaceOf(shape.traits),
                },
              }
            : {}),
        };
      }
      return { $ref: `#/components/schemas/${name}` };
    }

    const base = ((): JsonSchema => {
      switch (shape.type) {
        case 'string':
          // As smithy-openapi marks `@sensitive` strings.
          return hasTrait(traits, 'smithy.api#sensitive')
            ? { type: 'string', format: 'password' }
            : { type: 'string' };
        case 'boolean':
          return { type: 'boolean' };
        case 'byte':
        case 'short':
        case 'integer':
        case 'long':
          return { type: 'integer', format: INTEGER_FORMATS[shape.type] };
        case 'bigInteger':
          return { type: 'integer' };
        case 'float':
        case 'double': {
          const number = { type: 'number', format: NUMBER_FORMATS[shape.type] };
          return nonNumericFloats
            ? { anyOf: [number, { type: 'string', enum: ['NaN', 'Infinity', '-Infinity'] }] }
            : number;
        }
        case 'bigDecimal':
          return { type: 'number' };
        case 'timestamp':
          return timestampSchema(
            traits['smithy.api#timestampFormat'] ?? timestampFormats[location]
          );
        case 'blob':
          // Documents carry blobs base64-encoded; a payload carries the bytes.
          return { type: 'string', format: location === 'payload' ? 'binary' : 'byte' };
        case 'list':
        case 'set': {
          const items = shape.member
            ? toSchema(
                shape.member.target,
                location === 'payload' ? 'body' : location,
                shape.member.traits
              )
            : {};
          const listItems = hasTrait(traits, 'smithy.api#sparse') ? toNullable(items) : items;
          const itemName = shape.member?.traits?.['smithy.api#xmlName'];
          return {
            type: 'array',
            // Wrapped list entries are `member` elements unless renamed.
            items: xml
              ? withXml(listItems, {
                  name: typeof itemName === 'string' ? itemName : 'member',
                  ...namespaceOf(shape.member?.traits),
                })
              : listItems,
            ...(shape.type === 'set' || hasTrait(traits, 'smithy.api#uniqueItems')
              ? { uniqueItems: true }
              : {}),
          };
        }
        case 'map': {
          const value = shape.value ? toSchema(shape.value.target, 'body', shape.value.traits) : {};
          const keyName = shape.key?.traits?.['smithy.api#xmlName'];
          const valueName = shape.value?.traits?.['smithy.api#xmlName'];
          return {
            type: 'object',
            additionalProperties: hasTrait(traits, 'smithy.api#sparse') ? toNullable(value) : value,
            ...(xml
              ? {
                  [XML_MAP]: {
                    key: typeof keyName === 'string' ? keyName : 'key',
                    value: typeof valueName === 'string' ? valueName : 'value',
                    ...(namespaceOf(shape.key?.traits).namespace
                      ? { keyNamespace: namespaceOf(shape.key?.traits).namespace }
                      : {}),
                    ...(namespaceOf(shape.value?.traits).namespace
                      ? { valueNamespace: namespaceOf(shape.value?.traits).namespace }
                      : {}),
                  },
                }
              : {}),
          };
        }
        default:
          // Documents hold any JSON value.
          return {};
      }
    })();
    return {
      // Blobs are base64 everywhere but in a payload.
      ...withConstraints(base, shape.type, traits, shape.type === 'blob' && location !== 'payload'),
      ...annotations,
      ...(typeof documentation === 'string' && member ? { description: documentation } : {}),
    };
  };

  return { toSchema, toObjectSchema, components };
};
