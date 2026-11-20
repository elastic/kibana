/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/**
 * Compares what a connector action accepts with what the vendor accepts, in one direction: the
 * connector may be stricter than the vendor, never looser. A looser input lets an agent produce
 * a request the vendor rejects, which the recording never shows when the generated or fixture
 * value happens to be valid.
 */

export interface StrictnessGap {
  /** The keyword the vendor constrains and the connector doesn't match, e.g. `format`. */
  readonly keyword: string;
  /** The vendor's constraint, printed. */
  readonly vendor: string;
  /** What the connector declares, printed, or `nothing` when it declares no such constraint. */
  readonly connector: string;
}

type JsonSchema = Record<string, unknown>;

const NOTHING = 'nothing';

/**
 * Formats the validator enforces. OpenAPI's own numeric and binary formats (`int32`, `int64`,
 * `byte`, `binary`, `float`, `double`, `password`) describe an encoding rather than a value a
 * connector input could restate, so a connector is not asked to repeat them.
 */
const CHECKED_FORMATS = new Set([
  'date',
  'date-time',
  'duration',
  'email',
  'hostname',
  'idn-email',
  'idn-hostname',
  'ipv4',
  'ipv6',
  'iri',
  'iri-reference',
  'json-pointer',
  'regex',
  'relative-json-pointer',
  'time',
  'uri',
  'uri-reference',
  'uri-template',
  'uuid',
]);

const isSchema = (value: unknown): value is JsonSchema =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const numberAt = (schema: JsonSchema, keyword: string): number | undefined => {
  const value = schema[keyword];
  return typeof value === 'number' && Number.isFinite(value) ? value : undefined;
};

const stringAt = (schema: JsonSchema, keyword: string): string | undefined => {
  const value = schema[keyword];
  return typeof value === 'string' && value.length > 0 ? value : undefined;
};

const enumAt = (schema: JsonSchema): readonly unknown[] | undefined =>
  Array.isArray(schema.enum) ? schema.enum : undefined;

/**
 * The branches a union offers, so a connector that declares `z.union([...])` is read as the
 * widest of them: a gap has to hold for every branch to be one.
 */
const branchesOf = (schema: JsonSchema): JsonSchema[] => {
  for (const key of ['anyOf', 'oneOf'] as const) {
    const branches = schema[key];
    if (Array.isArray(branches)) {
      const schemas = branches.filter(isSchema);
      if (schemas.length > 0) {
        return schemas;
      }
    }
  }
  return [schema];
};

/** `allOf` parts constrain the same value, so their keywords are merged before comparing. */
const flattened = (schema: JsonSchema): JsonSchema => {
  const parts = Array.isArray(schema.allOf) ? schema.allOf.filter(isSchema) : [];
  if (parts.length === 0) {
    return schema;
  }
  const merged: JsonSchema = { ...schema };
  delete merged.allOf;
  for (const part of parts) {
    Object.assign(merged, flattened(part));
  }
  return merged;
};

/** `maximum`, and `exclusiveMaximum` read as the tightest bound either spells. */
const upperBound = (schema: JsonSchema): number | undefined => {
  const inclusive = numberAt(schema, 'maximum');
  // OpenAPI 3.0 writes `exclusiveMaximum: true` next to `maximum`; 3.1 gives it the value.
  const exclusive = numberAt(schema, 'exclusiveMaximum');
  if (inclusive !== undefined && exclusive !== undefined) {
    return Math.min(inclusive, exclusive);
  }
  return inclusive ?? exclusive;
};

const lowerBound = (schema: JsonSchema): number | undefined => {
  const inclusive = numberAt(schema, 'minimum');
  const exclusive = numberAt(schema, 'exclusiveMinimum');
  if (inclusive !== undefined && exclusive !== undefined) {
    return Math.max(inclusive, exclusive);
  }
  return inclusive ?? exclusive;
};

const print = (value: unknown): string =>
  typeof value === 'string' ? value : JSON.stringify(value) ?? String(value);

/** A ceiling the connector must not exceed: `maxLength`, `maximum`, `maxItems`. */
const ceilingGap = (
  keyword: string,
  vendor: number | undefined,
  connector: number | undefined
): StrictnessGap | undefined => {
  if (vendor === undefined) {
    return undefined;
  }
  if (connector === undefined) {
    return { keyword, vendor: `${vendor}`, connector: NOTHING };
  }
  return connector > vendor
    ? { keyword, vendor: `${vendor}`, connector: `${connector}` }
    : undefined;
};

/**
 * A floor the connector must not fall below: `minLength`, `minimum`, `minItems`. A length or
 * size floor of 0 allows everything, so it asks nothing of the connector; a `minimum` of 0 does
 * rule out negatives, so it still counts.
 */
const floorGap = (
  keyword: string,
  vendor: number | undefined,
  connector: number | undefined
): StrictnessGap | undefined => {
  if (vendor === undefined || (vendor === 0 && keyword !== 'minimum')) {
    return undefined;
  }
  if (connector === undefined) {
    return { keyword, vendor: `${vendor}`, connector: NOTHING };
  }
  return connector < vendor
    ? { keyword, vendor: `${vendor}`, connector: `${connector}` }
    : undefined;
};

const formatGap = (vendor: JsonSchema, connector: JsonSchema): StrictnessGap | undefined => {
  const wanted = stringAt(vendor, 'format');
  if (wanted === undefined || !CHECKED_FORMATS.has(wanted)) {
    return undefined;
  }
  const declared = stringAt(connector, 'format');
  if (declared === wanted) {
    return undefined;
  }
  // A `pattern` can enforce the same shape as a format, so a connector that has one is trusted.
  if (stringAt(connector, 'pattern') !== undefined) {
    return undefined;
  }
  // So can an enum, whose values are checked against the vendor's constraints in their own right.
  if (enumAt(connector) !== undefined) {
    return undefined;
  }
  return { keyword: 'format', vendor: wanted, connector: declared ?? NOTHING };
};

/**
 * Whether one regex accepts everything another does can't be decided in general, and a connector
 * often restates the vendor's shape differently on purpose: Trello takes a comma-separated list
 * of the ids a vendor parameter describes one at a time. So a connector that constrains the
 * shape at all is left to review, and only one that constrains it not at all is reported.
 */
/**
 * A pattern built only of anchors and wildcards, such as `.+` or `^.*$`. It describes no shape
 * an input could restate, so asking for one would say nothing an author could act on.
 */
const isWildcard = (pattern: string) => /^[\^$.*+()\s]*$/.test(pattern);

const patternGap = (vendor: JsonSchema, connector: JsonSchema): StrictnessGap | undefined => {
  const wanted = stringAt(vendor, 'pattern');
  if (
    wanted === undefined ||
    isWildcard(wanted) ||
    stringAt(connector, 'pattern') !== undefined ||
    stringAt(connector, 'format') !== undefined ||
    enumAt(connector) !== undefined
  ) {
    return undefined;
  }
  return { keyword: 'pattern', vendor: wanted, connector: NOTHING };
};

const enumGap = (vendor: JsonSchema, connector: JsonSchema): StrictnessGap | undefined => {
  const allowed = enumAt(vendor);
  if (allowed === undefined) {
    return undefined;
  }
  const declared = enumAt(connector);
  if (declared === undefined) {
    const constant = 'const' in connector ? [connector.const] : undefined;
    if (constant === undefined) {
      return { keyword: 'enum', vendor: print(allowed), connector: NOTHING };
    }
    return allowed.includes(constant[0])
      ? undefined
      : { keyword: 'enum', vendor: print(allowed), connector: print(constant) };
  }
  const extra = declared.filter((value) => !allowed.includes(value));
  return extra.length === 0
    ? undefined
    : { keyword: 'enum', vendor: print(allowed), connector: print(extra) };
};

const typeOf = (schema: JsonSchema): string | undefined => {
  const { type } = schema;
  if (typeof type === 'string') {
    return type === 'integer' ? 'number' : type;
  }
  // A union with `null`, as OpenAPI 3.1 and zod both spell a nullable value.
  if (Array.isArray(type)) {
    const named = type.filter((entry) => typeof entry === 'string' && entry !== 'null');
    return named.length === 1 ? String(named[0]).replace('integer', 'number') : undefined;
  }
  return undefined;
};

/**
 * Whether the two schemas describe the same kind of value. When they don't, the handler converts
 * the input on its way out, as CloudWatch's does from an ISO timestamp to epoch milliseconds,
 * and the vendor's rules say nothing about what the input may be.
 */
const sameKind = (vendor: JsonSchema, connector: JsonSchema): boolean => {
  const wanted = typeOf(vendor);
  const declared = typeOf(connector);
  return wanted === undefined || declared === undefined || wanted === declared;
};

/**
 * The vendor rules a fixed set of values breaks. An enum is the tightest an input can be, so it
 * is judged by what it allows rather than by which keywords it repeats: MISP's attribute types
 * are an enum of short names, and asking them to restate a `maxLength` of 100 says nothing.
 */
const gapsForValues = (vendor: JsonSchema, values: readonly unknown[]): StrictnessGap[] => {
  const strings = values.filter((value): value is string => typeof value === 'string');
  const numbers = values.filter((value): value is number => typeof value === 'number');
  const print_ = (value: unknown) => print(value);
  const breaks = (broken: unknown[], keyword: string, vendorText: string) =>
    broken.length === 0
      ? undefined
      : { keyword, vendor: vendorText, connector: print(broken.map(print_)) };

  const maxLength = numberAt(vendor, 'maxLength');
  const minLength = numberAt(vendor, 'minLength');
  const pattern = stringAt(vendor, 'pattern');
  const allowed = enumAt(vendor);
  const upper = upperBound(vendor);
  const lower = lowerBound(vendor);
  const matcher = (() => {
    if (pattern === undefined || isWildcard(pattern)) {
      return undefined;
    }
    try {
      return new RegExp(pattern, 'u');
    } catch {
      try {
        return new RegExp(pattern);
      } catch {
        return undefined;
      }
    }
  })();

  return [
    maxLength === undefined
      ? undefined
      : breaks(
          strings.filter((value) => value.length > maxLength),
          'maxLength',
          `${maxLength}`
        ),
    minLength === undefined
      ? undefined
      : breaks(
          strings.filter((value) => value.length < minLength),
          'minLength',
          `${minLength}`
        ),
    matcher === undefined
      ? undefined
      : breaks(
          strings.filter((value) => !matcher.test(value)),
          'pattern',
          pattern as string
        ),
    allowed === undefined
      ? undefined
      : breaks(
          values.filter((value) => !allowed.includes(value)),
          'enum',
          print(allowed)
        ),
    upper === undefined
      ? undefined
      : breaks(
          numbers.filter((value) => value > upper),
          'maximum',
          `${upper}`
        ),
    lower === undefined
      ? undefined
      : breaks(
          numbers.filter((value) => value < lower),
          'minimum',
          `${lower}`
        ),
  ].filter((gap): gap is StrictnessGap => gap !== undefined);
};

const gapsBetween = (vendor: JsonSchema, connector: JsonSchema): StrictnessGap[] => {
  if (!sameKind(vendor, connector)) {
    return [];
  }
  const fixed = enumAt(connector) ?? ('const' in connector ? [connector.const] : undefined);
  if (fixed !== undefined) {
    return gapsForValues(vendor, fixed);
  }
  const gaps: Array<StrictnessGap | undefined> = [
    formatGap(vendor, connector),
    patternGap(vendor, connector),
    enumGap(vendor, connector),
    ceilingGap('maxLength', numberAt(vendor, 'maxLength'), numberAt(connector, 'maxLength')),
    floorGap('minLength', numberAt(vendor, 'minLength'), numberAt(connector, 'minLength')),
    ceilingGap('maximum', upperBound(vendor), upperBound(connector)),
    floorGap('minimum', lowerBound(vendor), lowerBound(connector)),
    ceilingGap('maxItems', numberAt(vendor, 'maxItems'), numberAt(connector, 'maxItems')),
    floorGap('minItems', numberAt(vendor, 'minItems'), numberAt(connector, 'minItems')),
  ];
  return gaps.filter((gap): gap is StrictnessGap => gap !== undefined);
};

/**
 * The ways the connector's schema is looser than the vendor's. Empty when the connector is at
 * least as strict, which is all the rule asks: it may be stricter.
 *
 * A union on either side is read as its widest reading, so a gap is reported only when it holds
 * however the value is taken.
 */
export const compareInputStrictness = (
  vendorSchema: unknown,
  connectorSchema: unknown
): StrictnessGap[] => {
  if (!isSchema(vendorSchema) || !isSchema(connectorSchema)) {
    return [];
  }
  const vendorBranches = branchesOf(flattened(vendorSchema)).map(flattened);
  const connectorBranches = branchesOf(flattened(connectorSchema)).map(flattened);
  // The vendor accepts a value that any of its branches accepts, so the loosest branch is the
  // contract. The connector is loose only where every one of its branches is.
  const perVendorBranch = vendorBranches.map((vendor) => {
    const perConnectorBranch = connectorBranches.map((connector) => gapsBetween(vendor, connector));
    const sharedKeywords = perConnectorBranch.reduce<string[]>(
      (shared, gaps) => shared.filter((keyword) => gaps.some((gap) => gap.keyword === keyword)),
      [...new Set(perConnectorBranch.flatMap((gaps) => gaps.map(({ keyword }) => keyword)))]
    );
    return perConnectorBranch[0].filter(({ keyword }) => sharedKeywords.includes(keyword));
  });
  // Fewest gaps wins: the vendor branch the connector matches best is the one it is written for.
  return perVendorBranch.reduce((best, gaps) => (gaps.length < best.length ? gaps : best));
};
