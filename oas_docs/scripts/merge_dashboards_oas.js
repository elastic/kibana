/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/*
 * Replaces the placeholder Dashboards operations in the bundled Kibana spec with the full ones
 * from the separately hosted Dashboards API spec, and writes the result to a new file.
 *
 * Usage: node merge_dashboards_oas.js [--allow-missing-dashboards] <kibana.yaml> <dashboards-openapi.yaml> <output.yaml>
 *
 * With --allow-missing-dashboards, a Kibana spec that has no dashboards paths at all (a branch
 * from before the Dashboards API) is written to the output unchanged instead of failing.
 *
 * Only depends on the `yaml` package so it can run in CI without bootstrapping the repo.
 * Remove it, together with the publish workflow, once kibana.yaml carries the full schemas.
 * See https://github.com/elastic/kibana/issues/266195
 */

const fs = require('node:fs');
const { parse, stringify } = require('yaml');

const DASHBOARDS_TAG = 'Dashboards';
const DASHBOARDS_PATHS = ['/api/dashboards', '/api/dashboards/{id}'];
const SCHEMA_REF_PREFIX = '#/components/schemas/';
// Schemas of the dashboards spec that share a name with a Kibana schema are renamed
// instead of merged, because the two specs describe them differently.
const RENAME_PREFIX = 'Dashboards_API_';

const readYaml = (file) => parse(fs.readFileSync(file, 'utf8'));

const rewriteSchemaRefs = (node, renames) => {
  if (Array.isArray(node)) {
    node.forEach((child) => rewriteSchemaRefs(child, renames));
  } else if (node && typeof node === 'object') {
    for (const [key, value] of Object.entries(node)) {
      if (key === '$ref' && typeof value === 'string' && value.startsWith(SCHEMA_REF_PREFIX)) {
        const name = value.slice(SCHEMA_REF_PREFIX.length);
        if (renames.has(name)) node[key] = `${SCHEMA_REF_PREFIX}${renames.get(name)}`;
      } else {
        rewriteSchemaRefs(value, renames);
      }
    }
  }
};

const hasDashboardsPaths = (spec) => DASHBOARDS_PATHS.some((p) => spec.paths?.[p]);

const assertDashboardsPaths = (spec, label) => {
  const missing = DASHBOARDS_PATHS.filter((p) => !spec.paths?.[p]);
  if (missing.length) {
    throw new Error(`${label} is missing expected paths: ${missing.join(', ')}`);
  }
};

const copyProductMetaTags = (kibanaPaths, dashboardsPaths) => {
  // Every operation in kibana.yaml carries the product tag docs-builder uses.
  const productTags = Object.values(kibanaPaths)
    .flatMap((item) => Object.values(item))
    .find((op) => op?.['x-metaTags'])?.['x-metaTags'];
  if (!productTags) return;
  for (const item of Object.values(dashboardsPaths)) {
    for (const op of Object.values(item)) {
      if (op && typeof op === 'object' && op.operationId) op['x-metaTags'] = productTags;
    }
  }
};

const mergeDashboards = (kibana, dashboards) => {
  assertDashboardsPaths(kibana, 'Kibana spec');
  assertDashboardsPaths(dashboards, 'Dashboards spec');

  const dashboardsSchemas = dashboards.components?.schemas ?? {};
  const kibanaSchemas = kibana.components?.schemas ?? {};

  const renames = new Map(
    Object.keys(dashboardsSchemas)
      .filter((name) => name in kibanaSchemas)
      .map((name) => [name, `${RENAME_PREFIX}${name}`])
  );

  const paths = Object.fromEntries(DASHBOARDS_PATHS.map((p) => [p, dashboards.paths[p]]));
  rewriteSchemaRefs(paths, renames);
  rewriteSchemaRefs(dashboardsSchemas, renames);
  copyProductMetaTags(kibana.paths, paths);

  for (const [name, schema] of Object.entries(dashboardsSchemas)) {
    kibanaSchemas[renames.get(name) ?? name] = schema;
  }
  kibana.components = { ...kibana.components, schemas: kibanaSchemas };

  Object.assign(kibana.paths, paths);

  const dashboardsTag = dashboards.tags?.find((tag) => tag.name === DASHBOARDS_TAG);
  const tagIndex = kibana.tags?.findIndex((tag) => tag.name === DASHBOARDS_TAG) ?? -1;
  if (dashboardsTag && tagIndex >= 0) {
    // Keep Kibana's x-displayName and any other extensions, replace only the content.
    kibana.tags[tagIndex] = { ...kibana.tags[tagIndex], ...dashboardsTag };
  }

  return { spec: kibana, renamed: renames.size, added: Object.keys(dashboardsSchemas).length };
};

const main = () => {
  const args = process.argv.slice(2);
  const allowMissing = args.includes('--allow-missing-dashboards');
  const [kibanaFile, dashboardsFile, outputFile] = args.filter((arg) => !arg.startsWith('--'));
  if (!kibanaFile || !dashboardsFile || !outputFile) {
    console.error(
      'Usage: node merge_dashboards_oas.js [--allow-missing-dashboards] <kibana.yaml> <dashboards-openapi.yaml> <output.yaml>'
    );
    process.exit(1);
  }

  const kibana = readYaml(kibanaFile);
  if (allowMissing && !hasDashboardsPaths(kibana)) {
    fs.copyFileSync(kibanaFile, outputFile);
    console.log(`Wrote ${outputFile}: ${kibanaFile} has no dashboards paths, copied unchanged`);
    return;
  }

  const { spec, renamed, added } = mergeDashboards(kibana, readYaml(dashboardsFile));
  // YAML 1.1 mode keeps timestamp-like strings quoted, as in kibana.yaml, for 1.1 readers.
  fs.writeFileSync(outputFile, stringify(spec, { version: '1.1', lineWidth: 0 }));
  console.log(
    `Wrote ${outputFile}: replaced ${DASHBOARDS_PATHS.length} dashboards paths, added ${added} schemas (${renamed} renamed to avoid collisions)`
  );
};

if (require.main === module) {
  main();
}

module.exports = { mergeDashboards };
