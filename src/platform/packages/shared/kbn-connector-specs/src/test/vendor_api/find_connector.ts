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
import type { ConnectorSpec } from '../../connector_spec';

export interface FoundConnector {
  readonly connector: ConnectorSpec;
  readonly directory: string;
}

const SRC = path.resolve(__dirname, '../..');
const SPEC_EXPORT = /^export \* from '\.\/(specs\/[^']+)';$/gm;

const isConnectorSpec = (value: unknown): value is ConnectorSpec =>
  typeof value === 'object' &&
  value !== null &&
  'metadata' in value &&
  'actions' in value &&
  typeof (value as ConnectorSpec).metadata?.id === 'string';

/** Every connector exported from `all_specs.ts`, with its `vendor_api` folder. */
export const listConnectors = async (): Promise<FoundConnector[]> => {
  const index = await fs.readFile(path.join(SRC, 'all_specs.ts'), 'utf8');
  const found: FoundConnector[] = [];
  for (const [, modulePath] of index.matchAll(SPEC_EXPORT)) {
    const exports: Record<string, unknown> = await import(path.join(SRC, modulePath));
    const directory = path.join(SRC, path.dirname(modulePath), 'vendor_api');
    for (const connector of Object.values(exports).filter(isConnectorSpec)) {
      found.push({ connector, directory });
    }
  }
  return found;
};

/** Finds a connector by `metadata.id` (with or without the leading dot) and its `vendor_api` folder. */
export const findConnector = async (id: string): Promise<FoundConnector> => {
  const wanted = id.startsWith('.') ? id : `.${id}`;
  const match = (await listConnectors()).find(({ connector }) => connector.metadata.id === wanted);
  if (!match) {
    throw new Error(`No connector in all_specs.ts has metadata.id "${wanted}"`);
  }
  return match;
};
