/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { z } from 'zod/v4';
import {
  assertBoundedStringLabel,
  assertUnboundedStringReason,
  assertValidMinLength,
  BOUNDED_STRING_HELPER,
  getBoundedStringLimits,
  getStringHelperLimits,
  reportStringLengthViolation,
} from '@kbn/schema-string-helpers';
import type {
  ReportedStringHelperName,
  StringHelperLimits,
  StringHelperName,
} from '@kbn/schema-string-helpers';

export type ZodStringOptions = Exclude<NonNullable<Parameters<typeof z.string>[0]>, string> &
  Partial<StringHelperLimits>;

export type ZodStringWarnOptions = ZodStringOptions & {
  /**
   * Static field identifier for the violation metric. Never derive it from request
   * input — it becomes a metric attribute. Convention only, not enforced.
   *
   * @see https://www.elastic.co/docs/extend/kibana/key-concepts/security/bounded-string-schemas
   */
  label?: string;
};

export interface ZodStringHelper {
  (options?: ZodStringOptions): z.ZodString;
  warn(options?: ZodStringWarnOptions): z.ZodString;
}

const strictString = (
  { minLength, maxLength }: StringHelperLimits,
  options: ZodStringOptions
): z.ZodString => {
  const { minLength: _min, maxLength: _max, ...params } = options;
  return z.string(params).min(minLength).max(maxLength);
};

// Accepts overlong input and records a violation instead of rejecting it.
const reportingString = (
  helper: ReportedStringHelperName,
  { minLength, maxLength }: StringHelperLimits,
  { label, ...options }: ZodStringWarnOptions
): z.ZodString => {
  const { minLength: _min, maxLength: _max, ...params } = options;
  return z
    .string(params)
    .min(minLength)
    .check(({ value }) => {
      if (value.length > maxLength) {
        reportStringLengthViolation({
          helper,
          library: 'zod',
          maxLength,
          length: value.length,
          label,
        });
      }
    });
};

const makeHelper = (helper: StringHelperName): ZodStringHelper => {
  const strict = (options: ZodStringOptions = {}): z.ZodString =>
    strictString(getStringHelperLimits(helper, options), options);

  const warn = (options: ZodStringWarnOptions = {}): z.ZodString =>
    reportingString(helper, getStringHelperLimits(helper, options), options);

  return Object.assign(strict, { warn });
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
export const urlString = makeHelper('urlString');
export const pemCertificate = makeHelper('pemCertificate');
export const version = makeHelper('version');

export type ZodBoundedStringOptions = ZodStringOptions & { maxLength: number };

export type ZodBoundedStringWarnOptions = ZodBoundedStringOptions & {
  /**
   * Required static field identifier for the violation metric. Never derive it from request
   * input. Every boundedString() field reports under the same helper name, so the label is the
   * only way to tell them apart.
   *
   * @see https://www.elastic.co/docs/extend/kibana/key-concepts/security/bounded-string-schemas
   */
  label: string;
};

export interface ZodBoundedStringHelper {
  (options: ZodBoundedStringOptions): z.ZodString;
  warn(options: ZodBoundedStringWarnOptions): z.ZodString;
}

/**
 * Creates a string with an explicit, required maximum length. Use it only when no semantic
 * helper fits the field.
 */
export const boundedString: ZodBoundedStringHelper = Object.assign(
  (options: ZodBoundedStringOptions): z.ZodString =>
    strictString(getBoundedStringLimits(options), options),
  {
    warn: (options: ZodBoundedStringWarnOptions): z.ZodString => {
      assertBoundedStringLabel(options.label);
      return reportingString(BOUNDED_STRING_HELPER, getBoundedStringLimits(options), options);
    },
  }
);

export type UnboundedStringOptions = Omit<ZodStringOptions, 'maxLength'> & { reason: string };

/** Creates an intentionally unbounded string with a required explanation. */
export const unboundedString = ({
  reason,
  minLength,
  ...params
}: UnboundedStringOptions): z.ZodString => {
  assertUnboundedStringReason(reason);
  assertValidMinLength(minLength);
  const stringSchema = z.string(params);
  return minLength === undefined ? stringSchema : stringSchema.min(minLength);
};
