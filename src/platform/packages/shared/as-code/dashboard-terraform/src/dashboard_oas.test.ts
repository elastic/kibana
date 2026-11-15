/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { readFileSync } from 'fs';
import { join } from 'path';
import { parse } from 'yaml';
import { REPO_ROOT } from '@kbn/repo-info';
import { buildAttributeTree } from './attribute_tree';
import { extractDashboardOas, loadDashboardOas } from './dashboard_oas';
import type { OasDocument } from './oas_model';

const publishedOas: OasDocument = parse(
  readFileSync(join(REPO_ROOT, 'oas_docs/output/kibana.yaml'), 'utf8')
);

describe('the dashboard slice of the published OpenAPI file', () => {
  it('is up to date (run `node scripts/build_dashboard_terraform_oas` when this fails)', async () => {
    expect(await loadDashboardOas()).toEqual(extractDashboardOas(publishedOas));
  });

  it('describes the same Terraform resource as the whole published file', async () => {
    expect(buildAttributeTree(await loadDashboardOas())).toEqual(buildAttributeTree(publishedOas));
  });
});
