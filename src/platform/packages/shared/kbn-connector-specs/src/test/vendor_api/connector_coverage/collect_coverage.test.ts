/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import fs from 'fs/promises';
import os from 'os';
import path from 'path';
import { REPO_ROOT } from '@kbn/repo-info';
import { vendorApiExemptionsSchema } from '../exemptions';
import { listConnectors } from '../find_connector';
import {
  collectCoverage,
  readManifest,
  readServedTokenUrls,
  serializeCoverage,
} from './collect_coverage';

const EXEMPTIONS_FILE = path.resolve(__dirname, '../vendor_api_exemptions.json');

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

  it('reports the actions each connector declares, which api_type_actions does not', async () => {
    const documents = await collectCoverage(REPO_ROOT);
    const declared = new Map(
      (await listConnectors()).map(({ connector }) => [
        connector.metadata.id,
        Object.keys(connector.actions).length,
      ])
    );

    for (const { connector_id: id, total_actions: total } of documents) {
      expect(total).toBe(declared.get(id));
    }
  });

  // An exemption's API type is read from its free-text reason, so rewording one can drop it
  // into the catch-all without anyone noticing. This fails when that happens.
  it('classifies every exempt connector by its reason, never as a catch-all', async () => {
    const documents = await collectCoverage(REPO_ROOT);
    const byId = new Map(documents.map((document) => [document.connector_id, document]));
    // Driven by the committed list, not by the documents: filtering on `exemption_reason`
    // would drop a connector whose reason the collector lost, and pass on the rest.
    const exempted = Object.keys(
      vendorApiExemptionsSchema.parse(
        JSON.parse(await fs.readFile(EXEMPTIONS_FILE, 'utf8'))
      ) as Record<string, string>
    );

    expect(exempted.length).toBeGreaterThan(0);
    for (const id of exempted) {
      const document = byId.get(id);
      expect({ id, found: document !== undefined }).toEqual({ id, found: true });
      expect({ id, reason: document?.exemption_reason }).toEqual({
        id,
        reason: expect.any(String),
      });
      expect({ id, types: document?.api_types }).toEqual({
        id,
        types: expect.not.arrayContaining(['other', 'unexplained']),
      });
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

describe('readManifest', () => {
  let directory: string;

  beforeEach(async () => {
    directory = await fs.mkdtemp(path.join(os.tmpdir(), 'connector-coverage-'));
  });

  afterEach(async () => {
    await fs.rm(directory, { recursive: true, force: true });
  });

  it('reports no manifest when the connector has none', async () => {
    await expect(readManifest(directory)).resolves.toBeUndefined();
  });

  it('fails on a malformed manifest rather than reporting the connector as unrecorded', async () => {
    await fs.writeFile(path.join(directory, 'manifest.json'), '{ "sources": ');

    await expect(readManifest(directory)).rejects.toThrow(path.join(directory, 'manifest.json'));
  });

  it('fails on a manifest the schema rejects, naming the file', async () => {
    await fs.writeFile(
      path.join(directory, 'manifest.json'),
      JSON.stringify({ sources: 'not an object', operations: {} })
    );

    await expect(readManifest(directory)).rejects.toThrow(path.join(directory, 'manifest.json'));
  });
});

describe('readServedTokenUrls', () => {
  let directory: string;

  const writeSnapshot = async (snapshot: unknown) => {
    await fs.mkdir(path.join(directory, 'snapshots'), { recursive: true });
    await fs.writeFile(
      path.join(directory, 'snapshots', 'v1.openapi.json'),
      JSON.stringify(snapshot)
    );
  };

  beforeEach(async () => {
    directory = await fs.mkdtemp(path.join(os.tmpdir(), 'connector-served-tokens-'));
  });

  afterEach(async () => {
    await fs.rm(directory, { recursive: true, force: true });
  });

  const withTokenUrl = (tokenUrl: string, servers: Array<{ url: string }>) => ({
    openapi: '3.0.3',
    servers,
    components: {
      securitySchemes: {
        oauth: { type: 'oauth2', flows: { clientCredentials: { tokenUrl, scopes: {} } } },
      },
    },
  });

  it('keeps an absolute token URL as declared', async () => {
    await writeSnapshot(
      withTokenUrl('https://id.example.com/token', [{ url: 'https://api.example.com' }])
    );

    await expect(readServedTokenUrls(directory)).resolves.toEqual(['https://id.example.com/token']);
  });

  // Okta and Datadog declare a relative token URL against a templated server. Comparing the
  // raw `/oauth2/v1/token` with a connector's absolute default would never match.
  it('resolves a relative token URL against the servers, templates included', async () => {
    await writeSnapshot(withTokenUrl('/oauth2/v1/token', [{ url: 'https://{yourOktaDomain}' }]));

    await expect(readServedTokenUrls(directory)).resolves.toEqual([
      'https://{yourOktaDomain}/oauth2/v1/token',
    ]);
  });

  it('reports no token URLs when the connector has no snapshots', async () => {
    await expect(readServedTokenUrls(directory)).resolves.toEqual([]);
  });
});
