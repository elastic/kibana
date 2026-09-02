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

type OpenApiSchema = Record<string, unknown>;

interface OpenApiBundle {
  components?: {
    schemas?: Record<string, OpenApiSchema>;
  };
}

const bundlePath = path.resolve(__dirname, '../../../../../../../oas_docs/bundle.json');

const getDashboardPanelsSchemas = () => {
  const bundleContents = fs.readFileSync(bundlePath, 'utf8');
  const bundle = JSON.parse(bundleContents) as OpenApiBundle;
  const allSchemas = bundle.components?.schemas;

  if (allSchemas == null) {
    throw new Error(
      'Dashboard schema was not found in oas_docs/bundle.json. Run `node scripts/capture_oas_snapshot --include-path /api/dashboards` to generate the OAS bundle before running this test locally.'
    );
  }

  const resolveSchemaRefs = (schema: unknown, refsSeenInPath = new Set<string>()): unknown => {
    if (schema == null || typeof schema !== 'object') {
      return schema;
    }

    if (Array.isArray(schema)) {
      return schema.map((item) => resolveSchemaRefs(item, refsSeenInPath));
    }

    const schemaRecord = schema as OpenApiSchema;

    if (typeof schemaRecord.$ref === 'string') {
      const ref = schemaRecord.$ref;

      if (!ref.startsWith('#/components/schemas/') || refsSeenInPath.has(ref)) {
        return schema;
      }

      const schemaName = ref.slice('#/components/schemas/'.length);
      const referencedSchema = allSchemas[schemaName];

      if (referencedSchema == null) {
        return schema;
      }

      refsSeenInPath.add(ref);
      const resolvedSchema = resolveSchemaRefs(referencedSchema, refsSeenInPath);
      refsSeenInPath.delete(ref);

      return resolvedSchema;
    }

    return Object.fromEntries(
      Object.entries(schemaRecord).map(([key, value]) => [
        key,
        resolveSchemaRefs(value, refsSeenInPath),
      ])
    );
  };

  const dashboardPanelSchemas = Object.entries(allSchemas)
    .filter(([key]) => key.includes('kbn-dashboard-panel-type-'))
    .reduce((acc, [key, value]) => {
      const config = (value.properties as { config?: OpenApiSchema }).config;

      if (config == null) {
        return acc;
      }

      const panelSchema = resolveSchemaRefs(config);
      const panelSchemaHashed = createHash('sha256')
        .update(JSON.stringify(panelSchema))
        .digest('hex');

      acc.push([key, panelSchemaHashed]);

      return acc;
    }, [] as Array<[string, unknown]>);

  return dashboardPanelSchemas;
};

/**
 * If this test is failing on CI but passing locally, run `node scripts/capture_oas_snapshot --include-path /api/dashboards && yarn test:jest src/platform/plugins/shared/dashboard/server/api/schema_hash.test.ts -u`
 */
describe('dashboard OAS schema hash', () => {
  it('hashes kbn-dashboard-data from the generated OAS bundle', () => {
    const dashboardSchema = getDashboardPanelsSchemas();

    expect(dashboardSchema).toMatchInlineSnapshot(`
      Array [
        Array [
          "kbn-dashboard-panel-type-apm_service_map",
          "47b072f34f5da4b995295f4e98b7353702497716f50b27bca33f1b9bac0174c7",
        ],
        Array [
          "kbn-dashboard-panel-type-discover_session",
          "dcb52cc00912d678e76d7b7e299e4aaca8dc14ae279b94ff58e3e35438f22bc5",
        ],
        Array [
          "kbn-dashboard-panel-type-esql_control",
          "432f721f6fe53956d7e8009d10021e505d34adc7c5a170e88623e9a889b2cd30",
        ],
        Array [
          "kbn-dashboard-panel-type-image",
          "63a2a53025f6e95df145baaa834b5cd26bf7ec672a3039c2f4e609a708ea0e2f",
        ],
        Array [
          "kbn-dashboard-panel-type-markdown",
          "c5a347ead7e6355c743fd14b4e9a473dc5b8694518af8d095dda58ee5b810933",
        ],
        Array [
          "kbn-dashboard-panel-type-options_list_control",
          "4416006f3ab0985e9be3f1b38dff36dcbfd50faadef286190da8f85ad3d826c1",
        ],
        Array [
          "kbn-dashboard-panel-type-range_slider_control",
          "609332461bf2233326c1be850fbe44bb144aa6606add58d32018ca25e6a3b319",
        ],
        Array [
          "kbn-dashboard-panel-type-slo_alerts",
          "63d295b1b389891704e78ce3984c01a08777c57b418586c811f6d64005945a12",
        ],
        Array [
          "kbn-dashboard-panel-type-slo_burn_rate",
          "11e60d3f427ff8f6d3a28e52f0c9461c98ca4e117f78df5227f24d0a3bbdcbed",
        ],
        Array [
          "kbn-dashboard-panel-type-slo_error_budget",
          "e313f0f57926a4d45e5e167cec207965a37d86a68e9170a73c652845de36c3ed",
        ],
        Array [
          "kbn-dashboard-panel-type-slo_overview",
          "587f7e822c6d1050d18c79d0759bddf76ab58bfe2c0d45cba72d59549ec4a2e4",
        ],
        Array [
          "kbn-dashboard-panel-type-synthetics_monitors",
          "28ae87b7d898a62c670a1100fcfcedeba8db57a793470bda8a0e3ae018248551",
        ],
        Array [
          "kbn-dashboard-panel-type-synthetics_stats_overview",
          "d40f807db7166a1ee307fc74485eb39c86f83fab9403e046e6717b8eec3eb0dc",
        ],
        Array [
          "kbn-dashboard-panel-type-time_slider_control",
          "344b9ce8088ca40c9e543581ecc8daaf2801814fc525f2c6aa803b506433e77b",
        ],
        Array [
          "kbn-dashboard-panel-type-vis",
          "06256f09fc8e99a5c68b107444332bee2a1bef2b7393a80a3b39fd3a311b3cb0",
        ],
      ]
    `);
  });
});
