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
import { extractKibanaApiPaths } from './extract_kibana_api_paths';
import { KIBANA_API_DEFINITIONS_GENERATED_FOLDER } from './console_definition_paths';

const DEFAULT_SOURCE = Path.resolve(REPO_ROOT, 'oas_docs/output/kibana.yaml');

export function runGenerateKibanaApiPathsCli() {
  run(
    ({ log, flags }) => {
      const source =
        typeof flags.source === 'string' && flags.source ? flags.source : DEFAULT_SOURCE;
      const output =
        typeof flags.output === 'string' && flags.output
          ? flags.output
          : KIBANA_API_DEFINITIONS_GENERATED_FOLDER;

      if (!fs.existsSync(source)) {
        throw createFlagError(`Kibana OpenAPI bundle not found at ${source}`);
      }

      const endpoints = extractKibanaApiPaths(parse(fs.readFileSync(source, 'utf8')));

      fs.mkdirSync(output, { recursive: true });
      fs.readdirSync(output)
        .filter((file) => file.endsWith('.json'))
        .forEach((file) => fs.unlinkSync(Path.resolve(output, file)));

      Object.entries(endpoints).forEach(([operationId, definition]) => {
        fs.writeFileSync(
          Path.resolve(output, `${operationId}.json`),
          `${JSON.stringify({ [operationId]: definition }, null, 2)}\n`
        );
      });
      log.info(`wrote ${Object.keys(endpoints).length} endpoint definitions to ${output}`);
    },
    {
      description:
        'Generate Console autocomplete endpoint definitions (paths only) for Kibana APIs',
      usage: 'node scripts/generate_kibana_api_paths.js [--source <bundle>] [--output <folder>]',
      flags: {
        string: ['source', 'output'],
        help: `
--source        Path to the Kibana OpenAPI bundle (defaults to oas_docs/output/kibana.yaml)
--output        Folder to write one definition file per operation to (defaults to the Console
                kibana_api_definitions/generated folder)
`,
      },
    }
  );
}
