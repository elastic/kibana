/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/**
 * generate_required_field_fixes.js
 *
 * Auto-generates overlays/required_field_fixes.overlays.yaml from the merged
 * OAS bundles (output/kibana.yaml and output/kibana.serverless.yaml).
 *
 * Root cause: schema.maybe() in @kbn/config-schema emits x-oas-optional: true
 * on the resolved type schema, but the OAS generator still includes the field
 * in the parent schema's required array. This script detects every such
 * occurrence and emits a remove + update overlay action pair to fix it.
 *
 * The generated file is committed and applied early in the api-docs-overlay
 * pipeline, before any hand-authored overlays run.
 *
 * Usage (run from repo root):
 *   node oas_docs/scripts/generate_required_field_fixes.js
 * Or via make:
 *   make api-docs-fix-required
 */

const fs = require('fs');
const path = require('path');
const yaml = require('js-yaml');

const OAS_DOCS_DIR = path.resolve(__dirname, '..');
const STATEFUL_INPUT = path.join(OAS_DOCS_DIR, 'output', 'kibana.yaml');
const SERVERLESS_INPUT = path.join(OAS_DOCS_DIR, 'output', 'kibana.serverless.yaml');
const OUTPUT_FILE = path.join(OAS_DOCS_DIR, 'overlays', 'required_field_fixes.overlays.yaml');

// ─── helpers ──────────────────────────────────────────────────────────────────

function loadSpec(filePath) {
  if (!fs.existsSync(filePath)) return null;
  return yaml.load(fs.readFileSync(filePath, 'utf8'));
}

/**
 * Returns the schema name if a $ref points to an x-oas-optional component schema.
 *
 * Limitation: this only detects optional fields that are expressed as a $ref to a
 * named component schema that carries x-oas-optional: true. It does NOT detect
 * x-oas-optional: true set inline on a property schema (i.e. no $ref). As of writing,
 * ~30 inline occurrences exist in the bundles (e.g. fleet package policy inputs around
 * line 29633 of kibana.yaml), but none sit inside a parent required array, so there is
 * no active bug to fix. If that changes, extend this function to also check
 * propSchema['x-oas-optional'] directly.
 */
function optionalRefName(propSchema, optionalSchemas) {
  if (!propSchema?.$ref) return null;
  const m = propSchema.$ref.match(/^#\/components\/schemas\/(.+)$/);
  return m && optionalSchemas.has(m[1]) ? m[1] : null;
}

/** Walk a spec object recursively, collecting required-field bugs. */
function collectBugs(spec) {
  const optionalSchemas = new Set();
  for (const [name, schema] of Object.entries(spec.components?.schemas || {})) {
    if (schema['x-oas-optional'] === true) optionalSchemas.add(name);
  }

  const bugs = []; // { jsonpath, buggyFields, correctRequired }

  function walk(node, jsonpath) {
    if (!node || typeof node !== 'object' || Array.isArray(node)) return;

    if (node.properties && Array.isArray(node.required) && node.required.length > 0) {
      const buggy = node.required.filter((f) =>
        optionalRefName(node.properties[f], optionalSchemas)
      );
      if (buggy.length > 0) {
        const correct = node.required.filter(
          (f) => !optionalRefName(node.properties[f], optionalSchemas)
        );
        bugs.push({ jsonpath, buggyFields: buggy, correctRequired: correct });
      }
    }

    for (const [key, val] of Object.entries(node)) {
      if (!val || typeof val !== 'object') continue;
      if (Array.isArray(val)) {
        val.forEach((item, i) => walk(item, `${jsonpath}.${key}[${i}]`));
      } else {
        walk(val, `${jsonpath}.${key}`);
      }
    }
  }

  walk(spec, '$');
  return bugs;
}

/**
 * Convert a raw JSONPath (dot notation from the walker) to the bracket-notation
 * target format expected by the Bump overlay spec.
 */
function toTarget(jsonpath) {
  return jsonpath
    .replace(/\.components\.schemas\.([\w-]+)/g, ".components.schemas['$1']")
    .replace(/\.paths\.(\/[^.\s[\]]+)/g, (_, s) => `.paths['${s}']`)
    .replace(/\.content\.([^\s.'[\]]+\/[^\s.'[\]]+)/g, (_, s) => `.content['${s}']`);
}

// ─── overlay generation ───────────────────────────────────────────────────────

function generateActions(bugs) {
  const lines = [];
  for (const { jsonpath, buggyFields, correctRequired } of bugs) {
    const target = toTarget(jsonpath);
    lines.push(`  - target: "${target}.required"`);
    lines.push(
      `    description: "Remove x-oas-optional fields from required: ${buggyFields.join(', ')}"`
    );
    lines.push('    remove: true');
    lines.push(`  - target: "${target}"`);
    lines.push('    description: "Restore required array without x-oas-optional fields"');
    if (correctRequired.length === 0) {
      lines.push('    update:');
      lines.push('      required: []');
    } else {
      lines.push('    update:');
      lines.push('      required:');
      correctRequired.forEach((f) => lines.push(`        - ${JSON.stringify(f)}`));
    }
    lines.push('');
  }
  return lines.join('\n');
}

function buildOverlayFile(statefulBugs, serverlessBugs) {
  // Deduplicate: if a bug exists in both specs at the same path with the same fix, emit it once.
  // If the required arrays differ between specs at the same path, emit both and warn — the overlay
  // is shared across both specs so a mismatch means one spec won't be fully correct; that situation
  // should be investigated and fixed at the schema level.
  const serverlessMap = new Map(serverlessBugs.map((b) => [b.jsonpath, b]));
  const seen = new Set();
  const allBugs = [];
  for (const bug of [...statefulBugs, ...serverlessBugs]) {
    const key = bug.jsonpath;
    if (seen.has(key)) continue;
    seen.add(key);

    const counterpart = serverlessMap.get(key);
    if (
      counterpart &&
      statefulBugs.some((b) => b.jsonpath === key) &&
      JSON.stringify(counterpart.correctRequired.slice().sort()) !==
        JSON.stringify(bug.correctRequired.slice().sort())
    ) {
      // eslint-disable-next-line no-console
      console.warn(
        `[warn] Path "${key}" has different required arrays in stateful vs serverless specs. ` +
          `Stateful: [${bug.correctRequired}], Serverless: [${counterpart.correctRequired}]. ` +
          `Using stateful fix; consider fixing the schema difference upstream.`
      );
    }
    allBugs.push(bug);
  }

  const header = [
    '# THIS FILE IS AUTO-GENERATED — DO NOT EDIT BY HAND',
    `# Generated by: node oas_docs/scripts/generate_required_field_fixes.js`,
    '#',
    '# Root cause: schema.maybe() in @kbn/config-schema emits x-oas-optional: true',
    '# on the resolved type schema, but the OAS generator still includes the field',
    '# in the parent required array. Each fix below uses remove + update because',
    "# the Bump overlay engine appends arrays on 'update' alone rather than replacing them.",
    '#',
    `# ${allBugs.length} schema(s) affected.`,
    '',
    'overlay: 1.0.0',
    'info:',
    '  title: Required-field fixes (auto-generated)',
    '  version: 0.0.1',
    'actions:',
  ].join('\n');

  return `${header}\n${generateActions(allBugs)}`;
}

// ─── main ─────────────────────────────────────────────────────────────────────

function main() {
  const statefulSpec = loadSpec(STATEFUL_INPUT);
  const serverlessSpec = loadSpec(SERVERLESS_INPUT);

  if (!statefulSpec && !serverlessSpec) {
    console.error(
      'No input OAS files found. Run `make merge-api-docs` first to generate output/kibana.yaml.'
    );
    process.exit(1);
  }

  const statefulBugs = statefulSpec ? collectBugs(statefulSpec) : [];
  const serverlessBugs = serverlessSpec ? collectBugs(serverlessSpec) : [];

  const content = buildOverlayFile(statefulBugs, serverlessBugs);
  fs.writeFileSync(OUTPUT_FILE, content + '\n');

  const total = new Set([...statefulBugs, ...serverlessBugs].map((b) => b.jsonpath)).size;
  console.log(
    `✓ Generated ${OUTPUT_FILE} — ${total} schema(s) fixed ` +
      `(${statefulBugs.length} stateful, ${serverlessBugs.length} serverless)`
  );
}

main();
