/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { readdirSync } from 'fs';
import path from 'path';
import { getExtensionStepContracts } from './extension_step_definitions';

/**
 * The approved step IDs are derived at test-time from the committed fixture files at:
 *   src/platform/plugins/shared/workflows_extensions/test/scout/api/fixtures/approved_step_definitions/
 * Each file is named <step_id>.txt. This eliminates the previously hand-typed list and
 * ensures this guard stays in sync with the runtime approval list automatically.
 *
 * Adding a new step type requires ALL of the following in the same PR:
 *   1. Add to approved_step_definitions/ (runtime approval, pings @elastic/workflows-eng)
 *   2. Import the CommonStepDefinition in extension_step_definitions.ts
 *
 * Step 3 (add to a hand-typed ID list here) is no longer needed — the fixture dir IS the source
 * of truth for the expected set.
 */
const APPROVED_FIXTURES_DIR = path.resolve(
  __dirname,
  '../../../../plugins/shared/workflows_extensions/test/scout/api/fixtures/approved_step_definitions'
);

const loadApprovedStepIds = (): Set<string> =>
  new Set(
    readdirSync(APPROVED_FIXTURES_DIR)
      .filter((f) => f.endsWith('.txt'))
      .map((f) => f.replace(/\.txt$/, ''))
  );

describe('extension step definitions CLI catalog', () => {
  it('contains exactly the approved step type IDs', () => {
    const approved = loadApprovedStepIds();
    const actual = new Set(getExtensionStepContracts().map((c) => c.type));

    const missing = [...approved].filter((id) => !actual.has(id));
    const unexpected = [...actual].filter((id) => !approved.has(id));

    // Separate assertions so failures name the offending IDs explicitly.
    expect({ missing }).toEqual({ missing: [] });
    expect({ unexpected }).toEqual({ unexpected: [] });
  });
});
