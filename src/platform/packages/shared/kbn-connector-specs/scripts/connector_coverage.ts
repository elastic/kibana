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
import { run } from '@kbn/dev-cli-runner';
import { vendorApiExemptionsSchema } from '../src/test/vendor_api/exemptions';
import { buildCoverageDocument } from '../src/test/vendor_api/connector_coverage';
import { listConnectors } from '../src/test/vendor_api/find_connector';
import { parseManifest } from '../src/test/vendor_api/manifest';

const EXEMPTIONS = path.resolve(__dirname, '../vendor_api_exemptions.json');

/** Prints one JSON document per connector, ready for the Elasticsearch bulk API's `_source`. */
run(
  async () => {
    const exemptions = vendorApiExemptionsSchema.parse(
      JSON.parse(await fs.readFile(EXEMPTIONS, 'utf8'))
    );
    const documents = [];
    for (const { connector, directory } of await listConnectors()) {
      const manifestFile = path.join(directory, 'manifest.json');
      const manifest = await fs
        .readFile(manifestFile, 'utf8')
        .then(parseManifest)
        .catch(() => undefined);
      documents.push(
        buildCoverageDocument({
          spec: connector,
          manifest,
          exemptionReason: exemptions[connector.metadata.id],
        })
      );
    }
    for (const document of documents) {
      process.stdout.write(`${JSON.stringify(document)}\n`);
    }
    process.stderr.write(`${documents.length} connectors\n`);
  },
  {
    description:
      'Prints connector coverage documents (direction, API type, emulator and drift coverage) as NDJSON.',
  }
);
