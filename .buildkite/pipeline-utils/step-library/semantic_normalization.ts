/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

// Test-only: nothing outside tests imports this file.
//
// The closed list of semantic normalizations applied before two pipeline documents are compared.
// Adding an entry is a design change, not an implementation detail.

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

// 1. retry.automatic[].exit_status: numeric strings become integers, the form Buildkite's docs and
//    published pipeline schema specify (an integer, '*' or a list of integers).
const normalizeRule = (rule: unknown): unknown =>
  isRecord(rule) && typeof rule.exit_status === 'string' && /^-?\d+$/.test(rule.exit_status)
    ? { ...rule, exit_status: Number(rule.exit_status) }
    : rule;

const normalizeStep = (step: unknown): unknown => {
  if (!isRecord(step)) {
    return step;
  }

  const next: Record<string, unknown> = { ...step };

  if (isRecord(step.retry) && Array.isArray(step.retry.automatic)) {
    next.retry = { ...step.retry, automatic: step.retry.automatic.map(normalizeRule) };
  }

  if (Array.isArray(step.steps)) {
    next.steps = step.steps.map(normalizeStep);
  }

  return next;
};

export const normalizeSemantics = (document: unknown): unknown =>
  isRecord(document) && Array.isArray(document.steps)
    ? { ...document, steps: document.steps.map(normalizeStep) }
    : document;
