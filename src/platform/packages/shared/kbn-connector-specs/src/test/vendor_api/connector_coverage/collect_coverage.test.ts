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
import { collectCoverage, serializeCoverage } from './collect_coverage';

describe('collectCoverage', () => {
  it('describes every connector in all_specs.ts once', async () => {
    const documents = await collectCoverage(REPO_ROOT);
    const expected = (await listConnectors()).map(({ connector }) => connector.metadata.id);

    expect(documents.map(({ connector_id: id }) => id).sort()).toEqual([...expected].sort());
  });

  it('writes the same documents as NDJSON and as one JSON array', async () => {
    const documents = await collectCoverage(REPO_ROOT);

    const ndjson = serializeCoverage(documents, { asJson: false });
    const json = serializeCoverage(documents, { asJson: true });

    expect(ndjson.endsWith('\n')).toBe(true);
    expect(
      ndjson
        .trimEnd()
        .split('\n')
        .map((line) => JSON.parse(line))
    ).toEqual(documents);
    expect(JSON.parse(json)).toEqual(documents);
    expect(json.trimStart().startsWith('[')).toBe(true);
  });

  it('writes an empty JSON array and an empty NDJSON file for no documents', () => {
    expect(serializeCoverage([], { asJson: true })).toBe('[]\n');
    expect(serializeCoverage([], { asJson: false })).toBe('');
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
