/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { PND_WORKFLOWS } from '.';
import { managedWorkflowDefinitions } from '..';
import type { ManagedWorkflowId } from '../..';

/**
 * ## Why this file exists
 *
 * `managedWorkflowDefinitions` enumerates most owners' definitions one by one, but PND's are
 * **spread** from {@link PND_WORKFLOWS} so that registering a PND workflow and installing it are the
 * same edit — `PND_INSTALLABLE_WORKFLOW_IDS` derives from the same array, and `ready()`
 * orphan-deletes any `pluginId: 'pnd'` static definition that was registered but not installed.
 *
 * That spread is load-bearing for the **types**, not just the values. `ManagedWorkflowId` is
 * `keyof { [D in (typeof managedWorkflowDefinitions)[number] as D['id']]: D }`, so if the registry
 * array ever loses its readonly-tuple type — a missing `as const`, an annotation widening it to
 * `ManagedWorkflowDefinition[]` — then `D['id']` collapses to `string`, `ManagedWorkflowId` becomes
 * `string`, and every literal-id API in this package silently stops checking ids. Nothing fails: the
 * package still compiles, every runtime test still passes, and the loss shows up much later as a
 * typo'd id that no longer gets caught at the call site.
 *
 * The type assertion below is the guard for that, and it is enforced by the type-check gate rather
 * than by jest.
 */

/** `false` once `T` has widened to `string`, because `string extends string` holds. */
type IsLiteralUnion<T> = string extends T ? false : true;

// ⛔ Do not "fix" a failure here by changing `true` to `false` or by loosening the type. A failure
// means `ManagedWorkflowId` is no longer a union of literal ids — restore the registry's tuple type.
const managedWorkflowIdIsLiteralUnion: IsLiteralUnion<ManagedWorkflowId> = true;

describe('PND definitions reach the managed registry through the spread', () => {
  it('keeps ManagedWorkflowId a union of literal ids rather than string', () => {
    expect(managedWorkflowIdIsLiteralUnion).toBe(true);
  });

  it('registers every workflow PND owns', () => {
    expect(managedWorkflowDefinitions.map(({ id }) => id)).toEqual(
      expect.arrayContaining(PND_WORKFLOWS.map(({ id }) => id))
    );
  });

  it('registers each of them exactly once', () => {
    const registeredIds = managedWorkflowDefinitions.map(({ id }) => id);

    expect(PND_WORKFLOWS.map(({ id }) => registeredIds.filter((it) => it === id).length)).toEqual(
      PND_WORKFLOWS.map(() => 1)
    );
  });
});
