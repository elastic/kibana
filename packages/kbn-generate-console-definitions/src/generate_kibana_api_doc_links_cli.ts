/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import Path from 'path';
import fs from 'fs';
import { parse } from 'yaml';
import { run } from '@kbn/dev-cli-runner';
import { createFlagError } from '@kbn/dev-cli-errors';
import { REPO_ROOT } from '@kbn/repo-info';
import { KIBANA_API_DOC_LINKS_FILE } from '@kbn/console-plugin/common/constants';
import { extractKibanaApiDocLinks } from './extract_kibana_api_doc_links';

const DEFAULT_SOURCE = Path.resolve(REPO_ROOT, 'oas_docs/output/kibana.yaml');

export function runGenerateKibanaApiDocLinksCli() {
  run(
    ({ log, flags }) => {
      const source =
        typeof flags.source === 'string' && flags.source ? flags.source : DEFAULT_SOURCE;

      if (!fs.existsSync(source)) {
        throw createFlagError(`Kibana OpenAPI bundle not found at ${source}`);
      }

      log.info(`reading Kibana OpenAPI bundle from ${source}`);
      const oasDocument = parse(fs.readFileSync(source, 'utf8'));
      const docLinks = extractKibanaApiDocLinks(oasDocument);

      const templateCount = Object.keys(docLinks).length;
      const operationCount = Object.values(docLinks).reduce(
        (sum, methods) => sum + Object.keys(methods).length,
        0
      );

      fs.writeFileSync(KIBANA_API_DOC_LINKS_FILE, `${JSON.stringify(docLinks, null, 2)}\n`);
      log.info(
        `wrote ${templateCount} path templates (${operationCount} operations) to ${KIBANA_API_DOC_LINKS_FILE}`
      );
    },
    {
      description:
        'Generate the Kibana API path -> operationId map used by Console\'s "Open API reference" links',
      usage: `
node scripts/generate_kibana_api_doc_links.js
node scripts/generate_kibana_api_doc_links.js --source <path to a Kibana OpenAPI bundle>
`,
      flags: {
        string: ['source'],
        help: `
--source        Path to the Kibana OpenAPI bundle (defaults to oas_docs/output/kibana.yaml)
`,
      },
    }
  );
}
