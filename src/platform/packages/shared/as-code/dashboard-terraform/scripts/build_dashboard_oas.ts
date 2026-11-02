/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { readFileSync, writeFileSync } from 'fs';
import { relative, resolve } from 'path';
import { parse } from 'yaml';
import { run } from '@kbn/dev-cli-runner';
import { REPO_ROOT } from '@kbn/repo-info';
import { DASHBOARD_OAS_FILE, extractDashboardOas } from '../src/dashboard_oas';

const PUBLISHED_OAS = resolve(REPO_ROOT, 'oas_docs/output/kibana.yaml');
const OUTPUT = resolve(__dirname, '..', DASHBOARD_OAS_FILE);

run(
  ({ log }) => {
    const slice = extractDashboardOas(parse(readFileSync(PUBLISHED_OAS, 'utf8')));
    writeFileSync(OUTPUT, `${JSON.stringify(slice, null, 2)}\n`);
    log.success(
      `Wrote ${Object.keys(slice.components.schemas).length} components to ${relative(
        REPO_ROOT,
        OUTPUT
      )}`
    );
  },
  {
    description:
      'Copies the dashboard schemas of the published OpenAPI file (oas_docs/output/kibana.yaml) into the ' +
      '@kbn/as-code-dashboard-terraform package, which converts dashboards to Terraform at runtime.',
  }
);
