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
import { readOptional } from '../spec/load_vendor_specs';
import type { ConnectorCoverageDocument } from './connector_coverage';
import { buildCoverageDocument, getAuthTypeFacts } from './connector_coverage';

const EXEMPTIONS = path.resolve(__dirname, '../vendor_api_exemptions.json');

interface OpenApiSecurityScheme {
  flows?: Record<string, { tokenUrl?: string }>;
}

interface SnapshotDocument {
  servers?: Array<{ url?: string }>;
  components?: { securitySchemes?: Record<string, OpenApiSecurityScheme> };
}

/**
 * A spec may declare `tokenUrl` relative to its servers, as Okta's and Datadog's do. Taking it
 * verbatim would compare `/oauth2/v1/token` with a connector's absolute token URL and never
 * match, so the connector would be reported as not served when the emulator does serve it.
 */
const resolveAgainstServers = (
  tokenUrl: string,
  servers: SnapshotDocument['servers']
): string[] => {
  if (/^https?:\/\//i.test(tokenUrl)) return [tokenUrl];
  const resolved = (servers ?? [])
    .map(({ url }) => url)
    .filter((url): url is string => typeof url === 'string' && /^https?:\/\//i.test(url))
    .map((url) => {
      try {
        return new URL(tokenUrl, url.endsWith('/') ? url : `${url}/`).toString();
      } catch {
        return undefined;
      }
    })
    .filter((url): url is string => url !== undefined);
  // With no server to resolve against the raw value is still the best description of it.
  return resolved.length > 0 ? resolved : [tokenUrl];
};

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
    const snapshot: SnapshotDocument = await fs
      .readFile(path.join(snapshots, file), 'utf8')
      .then(JSON.parse)
      .catch(() => ({}));
    for (const scheme of Object.values(snapshot.components?.securitySchemes ?? {})) {
      for (const { tokenUrl } of Object.values(scheme.flows ?? {})) {
        if (tokenUrl) {
          for (const url of resolveAgainstServers(tokenUrl, snapshot.servers)) urls.add(url);
        }
      }
    }
  }
  return [...urls];
};

/**
 * The connector's committed manifest, or `undefined` when it has none.
 *
 * Only a missing file means "not recorded". A malformed manifest, or one the schema no longer
 * accepts, fails the run: swallowing it would report the connector as unrecorded and send the
 * dashboard wrong data with no error. The error names the file, because one bad manifest stops
 * the report for all of them and the JSON or schema message alone does not say whose it is.
 */
export const readManifest = async (
  directory: string
): Promise<ReturnType<typeof parseManifest> | undefined> => {
  const file = path.join(directory, 'manifest.json');
  const text = await readOptional(file);
  if (text === undefined) return undefined;
  try {
    return parseManifest(text);
  } catch (error) {
    throw new Error(`${file}: ${error instanceof Error ? error.message : String(error)}`, {
      cause: error,
    });
  }
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
    const manifest = await readManifest(directory);
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
