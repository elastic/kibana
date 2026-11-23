/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import {
  assertStringHelperLabel,
  assertUnboundedStringReason,
  assertValidMinLength,
  BOUNDED_STRING_HELPER,
  getBoundedStringLimits,
  getStringHelperLimits,
  reportStringLengthViolation,
} from '@kbn/schema-string-helpers';
import type {
  LabelRequiredHelperName,
  ReportedStringHelperName,
  StringHelperLimits,
  StringHelperName,
} from '@kbn/schema-string-helpers';
import type { StringOptions } from '../types/string_type';
import { StringType } from '../types/string_type';
import type { Type } from '../types/type';

export type StringWarnOptions = StringOptions & {
  /**
   * Static field identifier for the violation metric, never derived from request input. Optional
   * here, required by the helpers that many unrelated fields share (see `LabeledSchemaHelper`)
   * and by `boundedString.warn()`; that it is static is a convention, not enforced.
   *
   * @see https://www.elastic.co/docs/extend/kibana/key-concepts/security/bounded-string-schemas
   */
  label?: string;
};

export type LabeledStringWarnOptions = StringWarnOptions & { label: string };

export interface SchemaHelper {
  (options?: StringOptions): Type<string>;
  warn(options?: StringWarnOptions): Type<string>;
}

/** A helper whose reporting mode requires a `label`. */
export interface LabeledSchemaHelper {
  (options?: StringOptions): Type<string>;
  warn(options: LabeledStringWarnOptions): Type<string>;
}

// Accepts out-of-bounds input and records a violation instead of rejecting it, so that adopting
// reporting mode cannot change which requests a route accepts. The maximum and the helper's
// default minimum are reported and published as advisory OpenAPI extensions; an explicit
// `minLength` override describes the route's existing contract, so it stays enforced.
const reportingString = (
  helper: ReportedStringHelperName,
  { minLength, maxLength }: StringHelperLimits,
  { label, validate, ...options }: StringWarnOptions
): Type<string> => {
  const reportsMinimum = options.minLength === undefined;
  return new StringType({
    ...options,
    minLength: reportsMinimum ? undefined : minLength,
    maxLength: undefined,
    plannedMinLength: reportsMinimum && minLength > 0 ? minLength : undefined,
    plannedMaxLength: maxLength,
    validate: (value) => {
      if (reportsMinimum && value.length < minLength) {
        reportStringLengthViolation({
          helper,
          library: 'config-schema',
          bound: 'min',
          limit: minLength,
          length: value.length,
          label,
        });
      } else if (value.length > maxLength) {
        reportStringLengthViolation({
          helper,
          library: 'config-schema',
          bound: 'max',
          limit: maxLength,
          length: value.length,
          label,
        });
      }
      return validate?.(value);
    },
  });
};

const makeHelper = (helper: StringHelperName): SchemaHelper => {
  const strict = (options: StringOptions = {}): Type<string> =>
    new StringType({ ...options, ...getStringHelperLimits(helper, options) });

  const warn = (options: StringWarnOptions = {}): Type<string> =>
    reportingString(helper, getStringHelperLimits(helper, options), options);

  return Object.assign(strict, { warn });
};

// Helpers that bound a field shape rather than a Kibana concept: unrelated fields across plugins
// share them, so reporting mode needs a label to keep the violation metric readable.
const makeLabeledHelper = (helper: LabelRequiredHelperName): LabeledSchemaHelper => {
  const base = makeHelper(helper);

  return Object.assign((options?: StringOptions) => base(options), {
    warn: (options: LabeledStringWarnOptions): Type<string> => {
      assertStringHelperLabel(helper, options.label);
      return base.warn(options);
    },
  });
};

export const savedObjectId = makeHelper('savedObjectId');
export const savedObjectType = makeHelper('savedObjectType');
export const savedObjectVersion = makeHelper('savedObjectVersion');
export const spaceId = makeHelper('spaceId');
export const displayName = makeHelper('displayName');
export const description = makeHelper('description');
export const searchFilter = makeHelper('searchFilter');
export const aggregation = makeHelper('aggregation');
export const querySortField = makeHelper('querySortField');
export const urlString = makeLabeledHelper('urlString');
export const pemCertificate = makeLabeledHelper('pemCertificate');
export const version = makeLabeledHelper('version');

export type BoundedStringOptions = StringOptions & { maxLength: number };

export type BoundedStringWarnOptions = BoundedStringOptions & {
  /**
   * Required static field identifier for the violation metric, never derived from request.
   * Every boundedString() field reports under the same helper name, so the label is the only
   * way to tell them apart.
   *
   * @see https://www.elastic.co/docs/extend/kibana/key-concepts/security/bounded-string-schemas
   */
  label: string;
};

export interface BoundedStringHelper {
  (options: BoundedStringOptions): Type<string>;
  warn(options: BoundedStringWarnOptions): Type<string>;
}

/**
 * Creates a string with an explicit, required maximum length. Use it only when no semantic
 * helper fits the field.
 */
export const boundedString: BoundedStringHelper = Object.assign(
  (options: BoundedStringOptions): Type<string> =>
    new StringType({ ...options, ...getBoundedStringLimits(options) }),
  {
    warn: (options: BoundedStringWarnOptions): Type<string> => {
      assertStringHelperLabel(BOUNDED_STRING_HELPER, options.label);
      return reportingString(BOUNDED_STRING_HELPER, getBoundedStringLimits(options), options);
    },
  }
);

export type UnboundedStringOptions = Omit<StringOptions, 'maxLength'> & { reason: string };

/** Creates an intentionally unbounded string with a required explanation. */
export const unboundedString = ({ reason, ...options }: UnboundedStringOptions): Type<string> => {
  assertUnboundedStringReason(reason);
  assertValidMinLength(options.minLength);
  return new StringType({ ...options, maxLength: undefined });
};
