/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { z } from '@kbn/zod';

const filterExpressionPattern = /^(-?)([^:]*):(.*)$/;
const oneOfValuePattern = /^\[(.*)\]$/;

export const FilterOperator = {
  EQUALS: 'is',
  NOT_EQUALS: 'not',
  ONE_OF: 'oneOf',
  NOT_ONE_OF: 'notOneOf',
  EXISTS: 'exists',
  NOT_EXISTS: 'notExists',
} as const;

export const OperatorKind = {
  EQUALS: 'equals',
  ONE_OF: 'oneOf',
  EXISTS: 'exists',
} as const;

export type FilterOperatorLiteral = (typeof FilterOperator)[keyof typeof FilterOperator];

export type OperatorKindLiteral = (typeof OperatorKind)[keyof typeof OperatorKind];

const OPERATOR_KIND: Record<FilterOperatorLiteral, OperatorKindLiteral> = {
  [FilterOperator.EQUALS]: OperatorKind.EQUALS,
  [FilterOperator.NOT_EQUALS]: OperatorKind.EQUALS,
  [FilterOperator.ONE_OF]: OperatorKind.ONE_OF,
  [FilterOperator.NOT_ONE_OF]: OperatorKind.ONE_OF,
  [FilterOperator.EXISTS]: OperatorKind.EXISTS,
  [FilterOperator.NOT_EXISTS]: OperatorKind.EXISTS,
};

const OPERATOR_INVERSION = {
  [FilterOperator.EQUALS]: FilterOperator.NOT_EQUALS,
  [FilterOperator.NOT_EQUALS]: FilterOperator.EQUALS,
  [FilterOperator.ONE_OF]: FilterOperator.NOT_ONE_OF,
  [FilterOperator.NOT_ONE_OF]: FilterOperator.ONE_OF,
  [FilterOperator.EXISTS]: FilterOperator.NOT_EXISTS,
  [FilterOperator.NOT_EXISTS]: FilterOperator.EXISTS,
} as const satisfies Record<FilterOperatorLiteral, FilterOperatorLiteral>;

/** Returns the polarity-flipped counterpart of `operator`, preserving its value kind. */
export function invertOperator<Op extends FilterOperatorLiteral>(
  operator: Op
): (typeof OPERATOR_INVERSION)[Op] {
  return OPERATOR_INVERSION[operator];
}

export function getOperatorKind(operator: FilterOperatorLiteral): OperatorKindLiteral {
  return OPERATOR_KIND[operator];
}

const NEGATED_OPERATORS = new Set<FilterOperatorLiteral>([
  FilterOperator.NOT_EQUALS,
  FilterOperator.NOT_ONE_OF,
  FilterOperator.NOT_EXISTS,
]);

export function isNegatedOperator(operator: FilterOperatorLiteral | undefined): boolean {
  return operator !== undefined && NEGATED_OPERATORS.has(operator);
}

const filterBase = z.object({
  tagName: z.string(),
});

// operators that compare against a single value, e.g. `is:env:prod`
const SingleValueFilterExpression = filterBase.extend({
  operator: z.enum([FilterOperator.EQUALS, FilterOperator.NOT_EQUALS]),
  tagValue: z.string(),
});

// operators that compare against a list of values, e.g. `oneOf:env:prod,staging`
const MultiValueFilterExpression = filterBase.extend({
  operator: z.enum([FilterOperator.ONE_OF, FilterOperator.NOT_ONE_OF]),
  tagValue: z.array(z.string()),
});

// operators that don't carry a value at all, e.g. `exists:env:`
const NoValueFilterExpression = filterBase.extend({
  operator: z.enum([FilterOperator.EXISTS, FilterOperator.NOT_EXISTS]),
  // present (always undefined) so `tagValue` is a valid key to read across every union member
  tagValue: z.undefined(),
});

const FilterExpressionSchema = z.union([
  SingleValueFilterExpression,
  MultiValueFilterExpression,
  NoValueFilterExpression,
]);

export type FilterExpressionValue = z.output<typeof FilterExpressionSchema>;

/**
 * The not-yet-fully-specified state of a filter expression, e.g. while it's still being drafted
 * in the filter form. Every field is optional since the user may not have made a selection yet.
 */
export interface FilterExpressionDraft {
  operator?: FilterOperatorLiteral;
  tagName?: string;
  tagValue?: string | string[];
}

/**
 * Narrows a draft down to a complete, well-formed `FilterExpressionValue` — verifying not just
 * that each field is present, but that `tagValue`'s runtime shape (string vs. list vs. absent)
 * actually matches what the operator's kind requires.
 */
export function isValidFilterExpression(
  draft: FilterExpressionDraft
): draft is FilterExpressionValue {
  const { operator, tagName, tagValue } = draft;

  if (!operator || !tagName) {
    return false;
  }

  switch (getOperatorKind(operator)) {
    case OperatorKind.EQUALS:
      return typeof tagValue === 'string' && tagValue.length > 0;
    case OperatorKind.ONE_OF:
      return Array.isArray(tagValue) && tagValue.length > 0;
    case OperatorKind.EXISTS:
      return tagValue === undefined;
    default:
      return false;
  }
}

/**
 * filter expression codec declaration for CPS project picker filtering,
 * leverages zod for validation and transforms.
 */
export const filterExpressionCodec = z.codec(z.optional(z.string()), FilterExpressionSchema, {
  decode: (value) => {
    const [, negated, tagName, rawTagValue] = (value ?? '').match(filterExpressionPattern) ?? [];
    const oneOfMatch = rawTagValue?.match(oneOfValuePattern);

    switch (true) {
      case rawTagValue === 'exists': {
        const operator = negated ? FilterOperator.NOT_EXISTS : FilterOperator.EXISTS;
        return { operator, tagName, tagValue: undefined };
      }
      case oneOfMatch !== null: {
        const operator = negated ? FilterOperator.NOT_ONE_OF : FilterOperator.ONE_OF;
        return { operator, tagName, tagValue: oneOfMatch[1].split(',') };
      }
      default: {
        const operator = negated ? FilterOperator.NOT_EQUALS : FilterOperator.EQUALS;
        return { operator, tagName, tagValue: rawTagValue };
      }
    }
  },
  encode: (value) => {
    if (!value.operator) {
      return '';
    }

    const prefix = value.operator.includes('not') ? '-' : '';
    const resolvedTagName = [prefix, value.tagName].join('');

    switch (value.operator) {
      case FilterOperator.ONE_OF:
      case FilterOperator.NOT_ONE_OF:
        return [resolvedTagName, `[${value.tagValue?.join(',') ?? ''}]`].join(':');
      case FilterOperator.EXISTS:
      case FilterOperator.NOT_EXISTS:
        return [resolvedTagName, 'exists'].filter(Boolean).join(':');
      case FilterOperator.EQUALS:
      case FilterOperator.NOT_EQUALS:
      default:
        return [resolvedTagName, value.tagValue].filter(Boolean).join(':');
    }
  },
});

export type FilterExpressionCodecInput = z.input<typeof FilterExpressionSchema>;
export type FilterExpressionCodecOutput = z.output<typeof FilterExpressionSchema>;

/** Canonical Map key for a stored filter expression (matches encoded badge text semantics). */
export function getFilterExpressionLookupKey(expression: FilterExpressionValue): string {
  return filterExpressionCodec.encode(expression) as string;
}
