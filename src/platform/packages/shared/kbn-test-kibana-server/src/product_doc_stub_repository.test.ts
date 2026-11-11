/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import Fs from 'fs';
import Path from 'path';
import { fileURLToPath } from 'url';
import yauzl from 'yauzl';
import { PRODUCT_DOC_STUB_REPOSITORY_URL } from './product_doc_stub_repository';

const PRODUCTS = ['kibana', 'elasticsearch', 'observability', 'security'];
const JINA_INFERENCE_ID = '.jina-embeddings-v5-text-small';
const SECURITY_LABS_VERSION = '2025.04.30-103600';

const readZipEntry = (zipPath: string, entryPath: string): Promise<string> =>
  new Promise((resolve, reject) => {
    yauzl.open(zipPath, { lazyEntries: true }, (openErr, zipFile) => {
      if (openErr) {
        return reject(openErr);
      }
      zipFile.on('error', reject);
      zipFile.on('end', () => reject(new Error(`[${entryPath}] not found in [${zipPath}]`)));
      zipFile.on('entry', (entry: yauzl.Entry) => {
        if (entry.fileName !== entryPath) {
          return zipFile.readEntry();
        }
        zipFile.openReadStream(entry, (streamErr, stream) => {
          if (streamErr) {
            return reject(streamErr);
          }
          const chunks: Buffer[] = [];
          stream.on('data', (chunk: Buffer) => chunks.push(chunk));
          stream.on('error', reject);
          stream.on('end', () => {
            zipFile.close();
            resolve(Buffer.concat(chunks).toString('utf8'));
          });
        });
      });
      zipFile.readEntry();
    });
  });

describe('PRODUCT_DOC_STUB_REPOSITORY_URL', () => {
  const repositoryPath = fileURLToPath(PRODUCT_DOC_STUB_REPOSITORY_URL);
  const index = Fs.readFileSync(Path.join(repositoryPath, 'index.xml'), 'utf8');
  const keys = Array.from(index.matchAll(/<Key>([^<]+)<\/Key>/g), ([, key]) => key);

  it('is a file URL pointing at a directory with a bucket index', () => {
    expect(PRODUCT_DOC_STUB_REPOSITORY_URL.startsWith('file://')).toBe(true);
    expect(keys.length).toBeGreaterThan(0);
  });

  it('ships every artifact listed in the index', () => {
    for (const key of keys) {
      expect(Fs.existsSync(Path.join(repositoryPath, key))).toBe(true);
    }
  });

  it('lists a versioned and a latest artifact per product for ELSER and Jina', () => {
    for (const product of PRODUCTS) {
      expect(keys).toContain(`kb-product-doc-${product}-0.0.zip`);
      expect(keys).toContain(`kb-product-doc-${product}-latest.zip`);
      expect(keys).toContain(`kb-product-doc-${product}-0.0--${JINA_INFERENCE_ID}.zip`);
      expect(keys).toContain(`kb-product-doc-${product}-latest--${JINA_INFERENCE_ID}.zip`);
    }
  });

  it('lists a Security Labs artifact for ELSER and Jina', async () => {
    for (const key of [
      `security-labs-${SECURITY_LABS_VERSION}.zip`,
      `security-labs-${SECURITY_LABS_VERSION}--${JINA_INFERENCE_ID}.zip`,
    ]) {
      expect(keys).toContain(key);
      const manifest = JSON.parse(
        await readZipEntry(Path.join(repositoryPath, key), 'manifest.json')
      );
      expect(manifest).toEqual({
        formatVersion: '2.0.0',
        resourceType: 'security_labs',
        version: SECURITY_LABS_VERSION,
      });
    }
  });

  it('records a LastModified date for every artifact', () => {
    const entries = index.match(/<Contents>/g) ?? [];
    const dates = index.match(/<LastModified>[^<]+<\/LastModified>/g) ?? [];
    expect(dates).toHaveLength(entries.length);
  });

  // Format 1.0.0 artifacts require the legacy semantic_text index format, which current
  // Elasticsearch rejects for new indices, so they can never be installed
  it('ships artifacts in the current (non-legacy) manifest format', async () => {
    for (const key of keys) {
      const manifest = JSON.parse(
        await readZipEntry(Path.join(repositoryPath, key), 'manifest.json')
      );
      expect({ key, formatVersion: manifest.formatVersion }).toEqual({
        key,
        formatVersion: '2.0.0',
      });
    }
  });
});
