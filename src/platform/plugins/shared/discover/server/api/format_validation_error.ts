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

const NO_MATCHING_OPTION = 'Input does not match any supported format';
const TAB_DISCRIMINATORS = [['type'], ['data_source', 'type']] as const;

/** Renders validation diagnostics as a single message using Zod's standard layout. */
export const formatValidationError = (issues: readonly ZodIssue[]): string =>
  prettifyError({ issues: issues.flatMap((issue) => formatIssue(issue, [])) });

const formatIssue = (issue: ZodIssue, parentPath: PropertyKey[]): ValidationErrorDetail[] => {
  const path = [...parentPath, ...issue.path];

  if (issue.code !== 'invalid_union') return [{ path, message: issue.message }];

  if (issue.inclusive === false) {
    const matchingOptions = issue.matches.map((index) => index + 1).join(', ');

    return [
      { path, message: `Invalid input: matches more than one allowed option (${matchingOptions})` },
    ];
  }

  const discriminatorOptions = getDiscriminatorOptions(issue);

  if (discriminatorOptions) return [{ path, message: describeAllowedValues(discriminatorOptions) }];

  const rootMismatch = describeRootMismatch(issue.errors);

  if (rootMismatch) return [{ path, message: rootMismatch }];

  const tabBranches = findMatchingTabBranches(issue.errors, path);

  if (tabBranches?.length === 1)
    return tabBranches[0].flatMap((nested) => formatIssue(nested, path));

  const { commonErrors, remainingOptions } = getCommonErrors(issue.errors, path);

  if (remainingOptions.some((option) => option.length === 0)) return commonErrors;

  const message =
    tabBranches?.length === 0
      ? 'No supported tab format matches the combination of type and data_source.type.'
      : summarizeLocations(remainingOptions);

  return [...commonErrors, { path, message }];
};

const summarizeLocations = (options: ZodIssue[][]): string => {
  const locations = new Set(
    options.flat().flatMap((issue) => {
      if (issue.path.length > 0) return [z.core.toDotPath(issue.path.slice(0, 1))];
      if (issue.code === 'unrecognized_keys')
        return issue.keys.map((key) => z.core.toDotPath([key]));
      return ['(the value itself)'];
    })
  );

  if (locations.size === 0) return NO_MATCHING_OPTION;

  return `${NO_MATCHING_OPTION}. Depending on the intended format, check: ${[...locations].join(
    ', '
  )}`;
};

// Only inspect Discover tab branches when both discriminators were evaluated.
const findMatchingTabBranches = (
  branches: ZodIssue[][],
  path: PropertyKey[]
): ZodIssue[][] | undefined => {
  if (path.length !== 2 || path[0] !== 'tabs' || typeof path[1] !== 'number') return;

  const isDiscriminator = (issue: ZodIssue) =>
    TAB_DISCRIMINATORS.some((discriminator) => isEqual(issue.path, discriminator));

  const hasUnevaluatedDiscriminator = branches.some((branch) =>
    branch.some(
      (issue) =>
        ((issue.path.length === 0 || isEqual(issue.path, ['data_source'])) &&
          issue.code !== 'unrecognized_keys') ||
        (isDiscriminator(issue) && getAllowedValues(issue).length === 0)
    )
  );

  if (hasUnevaluatedDiscriminator) return;

  return branches.filter((branch) => !branch.some(isDiscriminator));
};

// Describes what every option expected when they all rejected the value itself.
const describeRootMismatch = (options: ZodIssue[][]): string | undefined => {
  const issues = options.flat();
  const isRootMismatch = (issue: ZodIssue) =>
    issue.path.length === 0 && (issue.code === 'invalid_type' || issue.code === 'invalid_value');

  if (issues.length === 0 || !issues.every(isRootMismatch)) return undefined;

  const expectedValues = new Set(issues.flatMap(getExpectedValues));

  return `Invalid input: expected ${[...expectedValues].join(' or ')}`;
};

// Keeps errors every option reports, or merges allowed values for a field they all reject.
const getCommonErrors = (options: ZodIssue[][], path: PropertyKey[]) => {
  const [first = [], ...others] = options;
  let remainingOptions = options;

  const commonErrors = first.flatMap((issue) => {
    const isShared = others.every((option) => option.some((other) => isEqual(issue, other)));
    const allowedValues = isShared ? undefined : mergeAllowedValues(issue, others);

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
  if (!values.length) return undefined;

  const otherValues = others.map((option) => {
    const matching = option.find(
      (other) => isEqual(other.path, issue.path) && getAllowedValues(other).length > 0
    );

    return matching ? getAllowedValues(matching) : [];
  });

  if (otherValues.some((allowed) => !allowed.length)) return undefined;

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

  return `Invalid input: expected one of ${[...allowedValues].join(', ')}`;
};

const formatValue = (value: unknown): string =>
  typeof value === 'string' ? JSON.stringify(value) : String(value);
