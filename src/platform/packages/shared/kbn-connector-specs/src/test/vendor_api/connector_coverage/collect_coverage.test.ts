/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { REPO_ROOT } from '@kbn/repo-info';
import { listConnectors } from '../find_connector';
import { collectCoverage } from './collect_coverage';

describe('collectCoverage', () => {
  it('describes every connector in all_specs.ts once', async () => {
    const documents = await collectCoverage(REPO_ROOT);
    const expected = (await listConnectors()).map(({ connector }) => connector.metadata.id);

    expect(documents.map(({ connector_id: id }) => id).sort()).toEqual([...expected].sort());
  });

  it('gives every API type of a connector an action count', async () => {
    const documents = await collectCoverage(REPO_ROOT);

    for (const { api_types: types, api_type_actions: counts } of documents) {
      expect(Object.keys(counts).sort()).toEqual([...types]);
    }
  });

  it('counts a connector as drift-protected exactly when it is emulated', async () => {
    const documents = await collectCoverage(REPO_ROOT);

    expect(documents.some(({ emulated }) => emulated)).toBe(true);
    expect(documents.some(({ emulated }) => !emulated)).toBe(true);
    for (const { emulated, drift_protection: driftProtection } of documents) {
      expect(driftProtection).toBe(emulated ? 'full' : 'none');
    }
  });
});
