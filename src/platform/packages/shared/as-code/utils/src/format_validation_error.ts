/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { isEqual } from 'lodash';
import { prettifyError, z } from '@kbn/zod';

type ZodIssue = z.core.$ZodIssue;

type ValidationErrorDetail = Pick<ZodIssue, 'path' | 'message'>;

const ERROR_MESSAGES = {
  multipleMatches: (options: string) =>
    `Invalid input: matches more than one allowed option (${options})`,
  expected: (values: string) => `Invalid input: expected ${values}`,
  expectedOneOf: (values: string) => `Invalid input: expected one of ${values}`,
  noMatchingOption: 'Input does not match any supported format',
};

/** Renders validation diagnostics as a single message using Zod's standard layout. */
export const formatValidationError = (issues: readonly ZodIssue[]): string =>
  prettifyError({ issues: formatValidationIssues(issues) });

/** Returns validation messages with structured paths and concise summaries for ambiguous unions. */
export const formatValidationIssues = (issues: readonly ZodIssue[]): ValidationErrorDetail[] =>
  issues.flatMap((issue) => formatIssue(issue, []));

const formatIssue = (issue: ZodIssue, parentPath: PropertyKey[]): ValidationErrorDetail[] => {
  const path = [...parentPath, ...issue.path];

  if (issue.code !== 'invalid_union') return [{ path, message: issue.message }];

  if (issue.inclusive === false) {
    const matchingOptions = issue.matches.map((index) => index + 1).join(', ');

    return [{ path, message: ERROR_MESSAGES.multipleMatches(matchingOptions) }];
  }

  const discriminatorOptions = getDiscriminatorOptions(issue);

  if (discriminatorOptions) return [{ path, message: describeAllowedValues(discriminatorOptions) }];

  const rootMismatch = describeRootMismatch(issue.errors);

  if (rootMismatch) return [{ path, message: rootMismatch }];

  const { commonErrors, remainingOptions } = getCommonErrors(issue.errors, path);

  if (remainingOptions.some((option) => option.length === 0)) return commonErrors;

  return [...commonErrors, { path, message: summarizeLocations(remainingOptions) }];
};

const summarizeLocations = (options: ZodIssue[][]): string => {
  const getLocations = (issue: ZodIssue): string[] => {
    if (issue.path.length > 0) return [z.core.toDotPath(issue.path.slice(0, 1))];
    if (issue.code === 'invalid_union' && issue.errors.length > 0) {
      return issue.errors.flatMap((branch) => branch.flatMap(getLocations));
    }
    if (issue.code === 'unrecognized_keys') return issue.keys.map((key) => z.core.toDotPath([key]));
    return ['(the value itself)'];
  };
  const locations = new Set(options.flatMap((branch) => branch.flatMap(getLocations)));

  if (locations.size === 0) return ERROR_MESSAGES.noMatchingOption;

  return `${ERROR_MESSAGES.noMatchingOption}. Depending on the intended format, check: ${[
    ...locations,
  ].join(', ')}`;
};

// Describes what every option expected when they all rejected the value itself.
const describeRootMismatch = (options: ZodIssue[][]): string | undefined => {
  const issues = options.flat();
  const isRootMismatch = (issue: ZodIssue) =>
    issue.path.length === 0 && (issue.code === 'invalid_type' || issue.code === 'invalid_value');

  if (issues.length === 0 || !issues.every(isRootMismatch)) return undefined;

  const expectedValues = new Set(issues.flatMap(getExpectedValues));

  return ERROR_MESSAGES.expected([...expectedValues].join(' or '));
};

// Keeps errors every option reports, or merges allowed values for a field they all reject.
const getCommonErrors = (options: ZodIssue[][], path: PropertyKey[]) => {
  const [first = [], ...others] = options;
  let remainingOptions = options.map((option) => [...option]);

  const commonErrors = first.flatMap((issue) => {
    const isShared = others.every((option) => option.some((other) => isEqual(issue, other)));
    const allowedValues = mergeAllowedValues(issue, others);

    if (!isShared && !allowedValues) return [];

    remainingOptions = remainingOptions.map((option) =>
      option.filter((other) =>
        isShared
          ? !isEqual(issue, other)
          : !(isEqual(issue.path, other.path) && getAllowedValues(other).length > 0)
      )
    );

    if (isShared) return formatIssue(issue, path);

    return [
      { path: [...path, ...issue.path], message: describeAllowedValues(allowedValues ?? []) },
    ];
  });

  return { commonErrors, remainingOptions };
};

// Combines the values allowed for the issue's field when every other option also restricts them.
const mergeAllowedValues = (issue: ZodIssue, others: ZodIssue[][]): unknown[] | undefined => {
  const values = getAllowedValues(issue);
  const otherValues = others.map((option) => {
    const matching = option.find(
      (other) => isEqual(other.path, issue.path) && getAllowedValues(other).length > 0
    );

    return matching ? getAllowedValues(matching) : [];
  });

  if (!values.length || otherValues.some((allowed) => !allowed.length)) return undefined;

  return [...values, ...otherValues.flat()];
};

// Returns the allowed discriminator values when no option matched the discriminator.
const getDiscriminatorOptions = (issue: ZodIssue): readonly unknown[] | undefined => {
  if (issue.code !== 'invalid_union' || issue.inclusive === false) return undefined;

  if (issue.discriminator === undefined || issue.errors.length > 0) return undefined;

  return issue.options ?? [];
};

const getExpectedValues = (issue: ZodIssue): string[] => {
  if (issue.code === 'invalid_type') return [issue.expected];

  if (issue.code === 'invalid_value') return issue.values.map(formatValue);

  return [];
};

const getAllowedValues = (issue: ZodIssue): readonly unknown[] => {
  if (issue.code === 'invalid_value') return issue.values;

  return getDiscriminatorOptions(issue) ?? [];
};

const describeAllowedValues = (values: readonly unknown[]): string => {
  const allowedValues = new Set(values.map(formatValue));

  return ERROR_MESSAGES.expectedOneOf([...allowedValues].join(', '));
};

const formatValue = (value: unknown): string =>
  typeof value === 'string' ? JSON.stringify(value) : String(value);
