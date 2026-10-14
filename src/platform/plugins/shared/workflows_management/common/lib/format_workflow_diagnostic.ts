/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { WorkflowYaml } from '@kbn/workflows';
import type { WorkflowDiagnostic } from '@kbn/workflows/types/v1';

/** Coerces a path segment that is a numeric index (number or numeric string). */
function asIndex(segment: string | number | undefined): number | undefined {
  if (typeof segment === 'number' && Number.isInteger(segment)) {
    return segment;
  }
  if (typeof segment === 'string' && /^\d+$/.test(segment)) {
    return Number(segment);
  }
  return undefined;
}

/** A loosely-typed workflow/step node we can drill nested step bodies out of. */
interface StepLikeNode {
  name?: unknown;
  steps?: unknown;
  branches?: unknown;
}

/** Reads `node[key]` as an array of child nodes, or undefined when absent. */
function childArray(
  node: StepLikeNode | undefined,
  key: 'steps' | 'branches'
): unknown[] | undefined {
  const value = node?.[key];
  return Array.isArray(value) ? value : undefined;
}

/**
 * Walks a diagnostic `path` and produces a step-label chain plus the trailing
 * field path. Every `steps.<index>` and `branches.<index>` hop is resolved to
 * the corresponding step/branch `name` by drilling into the parsed workflow, so
 * nested bodies read as `step "fan_out" › step "maybe_fail" › with.path`.
 *
 * The first path segment that isn't a resolvable step/branch hop begins the
 * field portion (e.g. `with.path`).
 */
function walkStepPath(
  path: ReadonlyArray<string | number>,
  parsedWorkflow?: Pick<WorkflowYaml, 'steps'> | undefined
): { labels: string[]; fieldPath: string } {
  const labels: string[] = [];
  // The node whose `steps`/`branches` children the next hop selects from. We
  // start from a synthetic root whose `steps` is the workflow's top-level steps.
  let currentNode: StepLikeNode | undefined = { steps: parsedWorkflow?.steps };

  // Returns the resolved index for a `steps`/`branches` hop at `pos`, or
  // undefined when the two segments at `pos` aren't such a hop.
  const stepHopIndex = (pos: number): number | undefined => {
    const segment = path[pos];
    if (segment !== 'steps' && segment !== 'branches') {
      return undefined;
    }
    return asIndex(path[pos + 1]);
  };

  // Skip any leading segments before the first step/branch hop (defensive: the
  // paths we see are rooted at `steps`, but a re-rooted path shouldn't break).
  let i = 0;
  while (i < path.length && stepHopIndex(i) === undefined) {
    i += 1;
  }

  // Consume consecutive step/branch hops, resolving each to its name.
  for (let idx = stepHopIndex(i); i < path.length && idx !== undefined; idx = stepHopIndex(i)) {
    const segment = path[i] as 'steps' | 'branches';
    const children = childArray(currentNode, segment);
    const node = children?.[idx] as StepLikeNode | undefined;
    const name = typeof node?.name === 'string' ? node.name : undefined;
    const kind = segment === 'branches' ? 'branch' : 'step';
    labels.push(name ? `${kind} "${name}"` : `${kind} #${idx + 1}`);
    currentNode = node;
    i += 2;
  }

  return { labels, fieldPath: path.slice(i).join('.') };
}

/**
 * Turns a diagnostic `path` (e.g. `['steps', 0, 'with', 'method']`) into a
 * human-readable location. Each step hop is substituted with the step's `name`
 * so the location reads `step "call" › with.method` instead of the opaque
 * `steps.0.with.method`. Nested bodies (parallel/foreach/if) resolve the full
 * chain, e.g. `step "fan_out" › step "maybe_fail" › with.path`.
 */
export function formatDiagnosticLocation(
  path: ReadonlyArray<string | number> | undefined,
  parsedWorkflow?: Pick<WorkflowYaml, 'steps'> | undefined
): string | undefined {
  if (!path || path.length === 0) {
    return undefined;
  }

  const { labels, fieldPath } = walkStepPath(path, parsedWorkflow);

  if (labels.length === 0) {
    // No step hops resolved — render the raw dotted path.
    return path.join('.');
  }

  const stepLabel = labels.join(' › ');
  return fieldPath ? `${stepLabel} › ${fieldPath}` : stepLabel;
}

/**
 * Zod v4 appends the raw property path to its messages as `… at steps.0.with.method`.
 * We render our own friendlier, name-resolved location, so strip that machine
 * suffix to avoid a doubled-up `… at steps.0.with.method (at step "call" › …)`.
 */
function stripZodPathSuffix(message: string, path: ReadonlyArray<string | number>): string {
  const rawPath = path.join('.');
  const suffix = ` at ${rawPath}`;
  return message.endsWith(suffix) ? message.slice(0, -suffix.length) : message;
}

/**
 * Formats a single validation diagnostic into a location-annotated, single-line
 * message suitable for a toast/list: `<message> (at <location>)`. Falls back to
 * the bare message when no usable location is present.
 */
export function formatWorkflowDiagnostic(
  diagnostic: Pick<WorkflowDiagnostic, 'message'> & Partial<Pick<WorkflowDiagnostic, 'path'>>,
  parsedWorkflow?: Pick<WorkflowYaml, 'steps'> | undefined
): string {
  const location = formatDiagnosticLocation(diagnostic.path, parsedWorkflow);
  if (!location) {
    return diagnostic.message;
  }
  const message = diagnostic.path
    ? stripZodPathSuffix(diagnostic.message, diagnostic.path)
    : diagnostic.message;
  return `${message} (at ${location})`;
}
