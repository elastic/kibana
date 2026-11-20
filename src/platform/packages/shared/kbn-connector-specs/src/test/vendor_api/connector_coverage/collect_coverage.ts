/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import fs from 'fs/promises';
import path from 'path';
import { vendorApiExemptionsSchema } from '../exemptions';
import { listConnectors } from '../find_connector';
import { parseManifest } from '../manifest';
import type { ConnectorCoverageDocument } from './connector_coverage';
import { buildCoverageDocument, getAuthTypeFacts } from './connector_coverage';

const EXEMPTIONS = path.resolve(__dirname, '../vendor_api_exemptions.json');

interface OpenApiSecurityScheme {
  flows?: Record<string, { tokenUrl?: string }>;
}

const exists = (file: string): Promise<boolean> =>
  fs.access(file).then(
    () => true,
    () => false
  );

const hasFiles = (directory: string): Promise<boolean> =>
  fs.readdir(directory).then(
    (entries) => entries.length > 0,
    () => false
  );

/** The token URLs the connector's committed vendor specs declare as an `oauth2` flow. */
const readServedTokenUrls = async (directory: string): Promise<string[]> => {
  const snapshots = path.join(directory, 'snapshots');
  const files = await fs.readdir(snapshots).catch(() => [] as string[]);
  const urls = new Set<string>();
  for (const file of files.filter((name) => name.endsWith('.json'))) {
    const snapshot: { components?: { securitySchemes?: Record<string, OpenApiSecurityScheme> } } =
      await fs
        .readFile(path.join(snapshots, file), 'utf8')
        .then(JSON.parse)
        .catch(() => ({}));
    for (const scheme of Object.values(snapshot.components?.securitySchemes ?? {})) {
      for (const { tokenUrl } of Object.values(scheme.flows ?? {})) {
        if (tokenUrl) urls.add(tokenUrl);
      }
    }
  }
  return [...urls];
};

/** One coverage document per connector in `all_specs.ts`, read from its committed artifacts. */
export const collectCoverage = async (
  repositoryRoot: string
): Promise<ConnectorCoverageDocument[]> => {
  const exemptions = vendorApiExemptionsSchema.parse(
    JSON.parse(await fs.readFile(EXEMPTIONS, 'utf8'))
  );
  const documents: ConnectorCoverageDocument[] = [];
  for (const { connector, directory } of await listConnectors()) {
    const manifest = await fs
      .readFile(path.join(directory, 'manifest.json'), 'utf8')
      .then(parseManifest)
      .catch(() => undefined);
    documents.push(
      buildCoverageDocument({
        spec: connector,
        manifest,
        exemptionReason: exemptions[connector.metadata.id],
        facts: {
          authTypes: getAuthTypeFacts(connector),
          servedTokenUrls: await readServedTokenUrls(directory),
          hasFixtures: await exists(path.join(directory, 'fixtures.json')),
          hasRecordings: await hasFiles(path.join(directory, 'recordings')),
          hasEmulatorResponses: await exists(path.join(directory, 'emulator_responses.json')),
          specDirectory: path.relative(repositoryRoot, path.dirname(directory)),
        },
      })
    );
  }
  return documents;
};

/** One document per line (NDJSON), or all of them in one indented JSON array. */
export const serializeCoverage = (
  documents: readonly ConnectorCoverageDocument[],
  { asJson }: { asJson: boolean }
): string =>
  asJson
    ? `${JSON.stringify(documents, null, 2)}\n`
    : documents.map((document) => `${JSON.stringify(document)}\n`).join('');
