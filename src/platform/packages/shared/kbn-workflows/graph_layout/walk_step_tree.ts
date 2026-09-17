/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { Step } from './types';
import { isStep } from './types';

/**
 * Discriminated union describing the structural slot (YAML key) a child list
 * lives under. Slot kinds mirror YAML keys — there is no `then` kind, because
 * the YAML key is `steps`; the `true`/`false` edge labels are a rendering
 * concern derived from the owner's type at layout time.
 *
 * `BranchSlot` is the addressable subset used in `WorkflowGraphInsertionContext`;
 * `fallback` / `iteration-fallback` are addressed via `mode: 'fallback'` instead.
 */
export type StepChildSlot =
  | { readonly kind: 'steps' }
  | { readonly kind: 'else' }
  | { readonly kind: 'branch'; readonly index: number; readonly name?: string }
  | { readonly kind: 'case'; readonly index: number; readonly match: string | number | boolean }
  | { readonly kind: 'default' }
  | { readonly kind: 'fallback' }
  | { readonly kind: 'iteration-fallback' };

export type BranchSlot = Extract<
  StepChildSlot,
  { kind: 'steps' | 'else' | 'branch' | 'case' | 'default' }
>;

/**
 * Enumerates every child-step slot inside a step, calling `visit` once per
 * declared slot. Covers `steps`, `else`, `branches[]`, `cases[]`, `default`,
 * `on-failure.fallback`, and `iteration-on-failure.fallback`.
 *
 * Slots are emitted in declaration order, with `steps: []` when the array is
 * absent or empty — callers may rely on presence vs. absence to distinguish
 * an empty branch from a missing one (e.g. for bypass-lane synthesis).
 */
export const visitStepChildSlots = (
  step: Step,
  visit: (slot: StepChildSlot, steps: Step[]) => void
): void => {
  const record = step as Record<string, unknown>;

  if ('steps' in record) {
    const raw = record.steps;
    visit({ kind: 'steps' }, Array.isArray(raw) ? (raw as unknown[]).filter(isStep) : []);
  }
  if ('else' in record) {
    const raw = record.else;
    visit({ kind: 'else' }, Array.isArray(raw) ? (raw as unknown[]).filter(isStep) : []);
  }
  if ('branches' in record && Array.isArray(record.branches)) {
    const branches = record.branches as Array<{ name?: string; steps?: unknown[] }>;
    branches.forEach((branch, index) => {
      visit(
        { kind: 'branch', index, name: branch.name },
        Array.isArray(branch.steps) ? (branch.steps as unknown[]).filter(isStep) : []
      );
    });
  }
  if ('cases' in record && Array.isArray(record.cases)) {
    const cases = record.cases as Array<{
      match?: string | number | boolean;
      steps?: unknown[];
    }>;
    cases.forEach((caseItem, index) => {
      visit(
        {
          kind: 'case',
          index,
          // `match` is required by schema but may be absent on a loose parse; fall back to index
          match: caseItem.match ?? index,
        },
        Array.isArray(caseItem.steps) ? (caseItem.steps as unknown[]).filter(isStep) : []
      );
    });
  }
  if ('default' in record) {
    const raw = record.default;
    visit({ kind: 'default' }, Array.isArray(raw) ? (raw as unknown[]).filter(isStep) : []);
  }
  // on-failure.fallback — asymmetric: the list lives inside the on-failure object
  if ('on-failure' in record && record['on-failure'] !== null && typeof record['on-failure'] === 'object') {
    const onFailure = record['on-failure'] as Record<string, unknown>;
    if ('fallback' in onFailure) {
      const raw = onFailure.fallback;
      visit({ kind: 'fallback' }, Array.isArray(raw) ? (raw as unknown[]).filter(isStep) : []);
    }
  }
  // iteration-on-failure.fallback — same shape, foreach/while only
  if (
    'iteration-on-failure' in record &&
    record['iteration-on-failure'] !== null &&
    typeof record['iteration-on-failure'] === 'object'
  ) {
    const iterOnFailure = record['iteration-on-failure'] as Record<string, unknown>;
    if ('fallback' in iterOnFailure) {
      const raw = iterOnFailure.fallback;
      visit(
        { kind: 'iteration-fallback' },
        Array.isArray(raw) ? (raw as unknown[]).filter(isStep) : []
      );
    }
  }
};

/**
 * Recursively walks a step tree depth-first, calling `visitor` for every step
 * including nested children in all slot kinds.
 */
export const walkStepTree = (
  steps: ReadonlyArray<Step>,
  visitor: (step: Step, depth: number) => void,
  depth: number = 0
): void => {
  for (const step of steps) {
    visitor(step, depth);
    visitStepChildSlots(step, (_slot, children) => {
      walkStepTree(children, visitor, depth + 1);
    });
  }
};

/**
 * Canonical list of YAML keys under which child steps may appear, derived from
 * the slot kinds above. Used by YAML-AST walkers that need key names rather
 * than slot objects. Kept in sync with `visitStepChildSlots` by the
 * object-model ↔ AST invariant test.
 */
export const STEP_CHILD_CONTAINER_KEYS = [
  'steps',
  'else',
  'branches',
  'cases',
  'default',
  'on-failure',
  'iteration-on-failure',
  'fallback',
] as const;

export type StepChildContainerKey = (typeof STEP_CHILD_CONTAINER_KEYS)[number];

/** @deprecated Use `visitStepChildSlots` instead. Kept for callers not yet migrated. */
export const visitStepChildren = (step: Step, callback: (children: Step[]) => void): void => {
  visitStepChildSlots(step, (_slot, children) => {
    if (children.length > 0) callback(children);
  });
};
