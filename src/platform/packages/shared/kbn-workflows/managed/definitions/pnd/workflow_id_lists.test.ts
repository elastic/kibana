/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import {
  PND_INSTALLABLE_WORKFLOW_IDS,
  PND_WATCH_DEEP_WORKFLOW,
  PND_WATCH_POST_INCIDENT_WORKFLOW,
  PND_WATCH_WORKFLOW_IDS,
  PND_WORKFLOWS,
} from '.';

/**
 * These assertions lived in `lifecycle_stub.test.ts` until kibana-phf4.12 retired the lifecycle stub.
 * They are about PND's **id lists**, not about the stub, and deleting the stub's test file with them
 * inside would have quietly dropped the only platform-side pin on the install list and on the nine
 * watch-and-worker ids the kibana-phf4.5 lane relocation had to preserve.
 */
describe('PND workflow id lists', () => {
  // Derived, not enumerated: `ready()` orphan-deletes any `pluginId: 'pnd'` static definition PND
  // did not install that boot, so the install list must follow `PND_WORKFLOWS` automatically. Pinned
  // against the same filter rather than against a spelled-out list of ids, so adding a definition
  // cannot fail here for the wrong reason. `install_static.test.ts` pins it against the full
  // registry, which is the set the reconciler actually compares against.
  it('installs every pnd static definition PND owns', () => {
    expect(PND_INSTALLABLE_WORKFLOW_IDS).toEqual(
      PND_WORKFLOWS.filter(
        ({ management, pluginId }) => pluginId === 'pnd' && management.lifecycle === 'static'
      ).map(({ id }) => id)
    );
  });

  // kibana-phf4.5 / ADR-015 moved the Attack Discovery lane between two watches that were both
  // already installed and both already resumable, so neither list may gain or lose a member. A
  // relocation that changed either one would be widening PND's install or resume boundary under
  // cover of a YAML swap, which is a different change needing its own review.
  it('keeps the same nine watch and worker ids the lane relocation started with', () => {
    expect([...PND_WATCH_WORKFLOW_IDS]).toEqual([
      'system-security-watch-floor',
      'system-security-watch-officer',
      'system-security-watch-dark',
      'system-security-watch-deep',
      'system-security-watch-detection',
      'system-security-watch-post-incident',
      'system-security-rule-preview',
      'system-security-rule-tuning',
      'system-security-rule-creation',
    ]);
  });

  it('keeps both relocation watches installable, exactly as before the move', () => {
    expect(PND_INSTALLABLE_WORKFLOW_IDS).toEqual(
      expect.arrayContaining(['system-security-watch-deep', 'system-security-watch-floor'])
    );
  });
});

// `versionStrategy: 'auto'` only re-applies a managed workflow's YAML when its version increases,
// so every YAML edit needs the bump alongside it.
//
// Floors rather than exact pins: these two started as `toBe(8)` / `toBe(2)`, which turned every
// later YAML edit into a failure in a file that has nothing to do with the edit. The epic-2 numbers
// are kept as the floor, and each epic's own bump is asserted beside the change that needed it —
// epic 3's Post-Incident Watch bump lives in `watch_post_incident.test.ts`.
//
// ⛔ The second floor is PND's **Post-Incident** Watch, not #283488's Detection Watch. It was
// written as `PND_WATCH_DETECTION_WORKFLOW` when that constant still named ours; after #283488
// merged its own orchestrator at `system-security-watch-detection`, the old name kept compiling and
// kept passing — against a definition PND does not own, whose version is already well past 2. A
// floor that cannot fail is worse than no floor, so this asserts on the definition it is about.
describe('watch versions re-apply edited YAML', () => {
  it('never regresses the Deep Watch below its epic 2 version', () => {
    expect(PND_WATCH_DEEP_WORKFLOW.version).toBeGreaterThanOrEqual(8);
  });

  it('never regresses the Post-Incident Watch below its epic 2 version', () => {
    expect(PND_WATCH_POST_INCIDENT_WORKFLOW.version).toBeGreaterThanOrEqual(2);
  });
});
