/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { getExtensionStepContracts } from './extension_step_definitions';

/**
 * Mirrors the step IDs in APPROVED_STEP_DEFINITIONS
 * (workflows_extensions/test/scout/api/fixtures/approved_step_definitions.ts).
 *
 * Adding a new step type requires ALL of the following in the same PR:
 *   1. Add to APPROVED_STEP_DEFINITIONS (runtime approval, pings @elastic/workflows-eng)
 *   2. Import the CommonStepDefinition in extension_step_definitions.ts
 *   3. Add the step ID to EXPECTED_STEP_TYPE_IDS below
 *
 * Steps marked "placeholder" use z.any() schemas because their plugin is not
 * accessible from a platform package (private visibility).
 */
const EXPECTED_STEP_TYPE_IDS = new Set([
  'ai.agent',
  'ai.classify',
  'ai.prompt',
  'ai.summarize',
  'cases.addAlerts',
  'cases.addComment',
  'cases.addEvents',
  'cases.addObservables',
  'cases.addTags',
  'cases.assignCase',
  'cases.closeCase',
  'cases.createCase',
  'cases.createCaseFromTemplate',
  'cases.deleteCases',
  'cases.deleteObservable',
  'cases.findCases',
  'cases.findSimilarCases',
  'cases.getAllAttachments',
  'cases.getCase',
  'cases.getCases',
  'cases.getCasesByAlertId',
  'cases.setCategory',
  'cases.setCustomField',
  'cases.setDescription',
  'cases.setSeverity',
  'cases.setStatus',
  'cases.setTitle',
  'cases.unassignCase',
  'cases.updateCase',
  'cases.updateCases',
  'cases.updateObservable',
  'contextEngine.addEntry',
  'data.aggregate',
  'data.concat',
  'data.dedupe',
  'data.filter',
  'data.find',
  'data.map',
  'data.parseJson',
  'data.regexExtract',
  'data.regexReplace',
  'data.stringifyJson',
  'search.rerank',
  'security.buildAlertEntityGraph', // placeholder: security_solution plugin is private
  'security.renderAlertNarrative', // placeholder: security_solution plugin is private
]);

describe('extension step definitions CLI catalog', () => {
  it('contains exactly the approved step type IDs', () => {
    const actual = new Set(getExtensionStepContracts().map((c) => c.type));

    const missing = [...EXPECTED_STEP_TYPE_IDS].filter((id) => !actual.has(id));
    const unexpected = [...actual].filter((id) => !EXPECTED_STEP_TYPE_IDS.has(id));

    // Separate assertions so failures name the offending IDs explicitly.
    expect({ missing }).toEqual({ missing: [] });
    expect({ unexpected }).toEqual({ unexpected: [] });
  });
});
