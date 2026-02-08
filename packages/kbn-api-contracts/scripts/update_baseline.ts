/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { resolve } from 'path';
import { writeFile, mkdir } from 'fs/promises';
import { dirname } from 'path';
import { dump } from 'js-yaml';
import { run } from '@kbn/dev-cli-runner';
import { loadOas } from '../src/input/load_oas';
import { normalizeOas } from '../src/input/normalize_oas';
import { selectBaseline, type Distribution } from '../src/baseline/select_baseline';

run(
  async ({ flags, log }) => {
    const distribution = flags.distribution as Distribution;
    const specPath =
      (flags.specPath as string) ||
      (distribution === 'stack'
        ? 'oas_docs/output/kibana.yaml'
        : 'oas_docs/output/kibana.serverless.yaml');
    const version = flags.version as string | undefined;
    const allowServerless = flags.allowServerless as boolean;

    if (!distribution || !['stack', 'serverless'].includes(distribution)) {
      throw new Error('--distribution must be either "stack" or "serverless"');
    }

    if (distribution === 'serverless' && !allowServerless) {
      throw new Error(
        'Serverless baseline updates are blocked by default. Use --allowServerless to override (post-promotion pipeline only).'
      );
    }

    log.info(`Updating ${distribution} baseline...`);
    log.info(`Source spec: ${specPath}`);

    const currentSpec = await loadOas(resolve(process.cwd(), specPath));
    const normalized = normalizeOas(currentSpec);

    const baselineSelection = selectBaseline(distribution, version);
    const outputPath = baselineSelection.path;

    log.info(`Writing baseline to: ${outputPath}`);

    await mkdir(dirname(outputPath), { recursive: true });
    await writeFile(outputPath, dump(normalized), 'utf-8');

    log.success(`Baseline updated successfully`);
  },
  {
    flags: {
      string: ['distribution', 'specPath', 'version'],
      boolean: ['allowServerless'],
      help: `
        --distribution      Required. Either "stack" or "serverless"
        --specPath          Path to the current OpenAPI spec (default: oas_docs/output/kibana*.yaml)
        --version           Semver version for stack baseline target
        --allowServerless   Allow serverless baseline updates (post-promotion pipeline only)
      `,
    },
  }
);
