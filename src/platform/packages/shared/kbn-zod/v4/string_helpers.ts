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
  assertStringHelperLabel,
  assertUnboundedStringReason,
  assertValidMinLength,
  BOUNDED_STRING_HELPER,
  getBoundedStringLimits,
  getStringHelperLimits,
  reportStringLengthViolation,
  X_KIBANA_PLANNED_MAX_LENGTH,
  X_KIBANA_PLANNED_MIN_LENGTH,
} from '@kbn/schema-string-helpers';
import type {
  LabelRequiredHelperName,
  ReportedStringHelperName,
  StringHelperLimits,
  StringHelperName,
} from '@kbn/schema-string-helpers';

export type ZodStringOptions = Exclude<NonNullable<Parameters<typeof z.string>[0]>, string> &
  Partial<StringHelperLimits>;

export type ZodStringWarnOptions = ZodStringOptions & {
  /**
   * Static field identifier for the violation metric. Never derive it from request input — it
   * becomes a metric attribute. Optional here, required by the helpers that many unrelated
   * fields share (see `LabeledZodStringHelper`) and by `boundedString.warn()`; that it is
   * static is a convention, not enforced.
   *
   * @see https://www.elastic.co/docs/extend/kibana/key-concepts/security/bounded-string-schemas
   */
  label?: string;
};

export type LabeledZodStringWarnOptions = ZodStringWarnOptions & { label: string };

export interface ZodStringHelper {
  (options?: ZodStringOptions): z.ZodString;
  warn(options?: ZodStringWarnOptions): z.ZodString;
}

/** A helper whose reporting mode requires a `label`. */
export interface LabeledZodStringHelper {
  (options?: ZodStringOptions): z.ZodString;
  warn(options: LabeledZodStringWarnOptions): z.ZodString;
}

const strictString = (
  { minLength, maxLength }: StringHelperLimits,
  options: ZodStringOptions
): z.ZodString => {
  const { minLength: _min, maxLength: _max, ...params } = options;
  return z.string(params).min(minLength).max(maxLength);
};

// Accepts out-of-bounds input and records a violation instead of rejecting it, so that adopting
// reporting mode cannot change which requests a route accepts. The maximum and the helper's
// default minimum are reported and published as advisory OpenAPI extensions; an explicit
// `minLength` override describes the route's existing contract, so it stays enforced.
const reportingString = (
  helper: ReportedStringHelperName,
  { minLength, maxLength }: StringHelperLimits,
  { label, ...options }: ZodStringWarnOptions
): z.ZodString => {
  const { minLength: explicitMinLength, maxLength: _max, ...params } = options;
  const reportsMinimum = explicitMinLength === undefined;
  const base = reportsMinimum ? z.string(params) : z.string(params).min(minLength);
  return base
    .check(({ value }) => {
      if (reportsMinimum && value.length < minLength) {
        reportStringLengthViolation({
          helper,
          library: 'zod',
          bound: 'min',
          limit: minLength,
          length: value.length,
          label,
        });
      } else if (value.length > maxLength) {
        reportStringLengthViolation({
          helper,
          library: 'zod',
          bound: 'max',
          limit: maxLength,
          length: value.length,
          label,
        });
      }
    })
    .meta({
      openapi: {
        ...(reportsMinimum && minLength > 0 ? { [X_KIBANA_PLANNED_MIN_LENGTH]: minLength } : {}),
        [X_KIBANA_PLANNED_MAX_LENGTH]: maxLength,
      },
    });
};

const makeHelper = (helper: StringHelperName): ZodStringHelper => {
  const strict = (options: ZodStringOptions = {}): z.ZodString =>
    strictString(getStringHelperLimits(helper, options), options);

  const warn = (options: ZodStringWarnOptions = {}): z.ZodString =>
    reportingString(helper, getStringHelperLimits(helper, options), options);

  return Object.assign(strict, { warn });
};

// Helpers that bound a field shape rather than a Kibana concept: unrelated fields across plugins
// share them, so reporting mode needs a label to keep the violation metric readable.
const makeLabeledHelper = (helper: LabelRequiredHelperName): LabeledZodStringHelper => {
  const base = makeHelper(helper);

  return Object.assign((options?: ZodStringOptions) => base(options), {
    warn: (options: LabeledZodStringWarnOptions): z.ZodString => {
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
      assertStringHelperLabel(BOUNDED_STRING_HELPER, options.label);
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
