/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { createHash } from 'crypto';
import fs from 'fs';
import path from 'path';

interface OpenApiBundle {
  components?: {
    schemas?: Record<string, unknown>;
  };
}

const bundlePath = path.resolve(__dirname, '../../../../../../../oas_docs/bundle.json');

const getDashboardSchema = () => {
  const bundleContents = fs.readFileSync(bundlePath, 'utf8');
  const bundle = JSON.parse(bundleContents) as OpenApiBundle;
  const dashboardSchema = bundle.components?.schemas?.['kbn-dashboard-data'];

  if (dashboardSchema == null) {
    throw new Error(
      'Dashboard schema was not found in oas_docs/bundle.json. Run `node scripts/capture_oas_snapshot --include-path /api/dashboards` to generate the OAS bundle before running this test locally.'
    );
  }

  return dashboardSchema;
};

/**
 * If this test is failing on CI but passing locally, run `node scripts/capture_oas_snapshot --include-path /api/dashboards && yarn test:jest src/platform/plugins/shared/dashboard/server/api/schema_hash.test.ts -u`
 */
describe('dashboard OAS schema hash', () => {
  it('hashes kbn-dashboard-data from the generated OAS bundle', () => {
    const dashboardSchema = getDashboardSchema();
    const schemaHash = createHash('sha256').update(JSON.stringify(dashboardSchema)).digest('hex');

    expect(schemaHash).toMatchInlineSnapshot(
      `"c9f21a8cae1e8daf2c6c1cdc443986b3b8d96f415b00762d425f44fc184dc2e5"`
    );
  });
});
