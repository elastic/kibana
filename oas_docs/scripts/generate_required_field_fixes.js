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
 * Detects two categories of wrongly-required fields and emits a remove + update
 * overlay action pair for each affected schema:
 *
 *   1. x-oas-optional fields — schema.maybe() in @kbn/config-schema emits
 *      x-oas-optional: true on the resolved type schema, but the OAS generator
 *      still includes the field in the parent schema's required array.
 *
 *   2. default-value fields — schema.object/array/etc. with a defaultValue option
 *      emits a `default:` on the resolved schema, making the field optional at
 *      runtime (callers may omit it and the server applies the default), but the
 *      OAS generator still lists it in required.
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

/**
 * Load an OAS spec from disk. Supports both YAML (.yaml/.yml) and JSON (.json).
 * Returns null if the file does not exist.
 */
function loadSpec(filePath) {
  if (!fs.existsSync(filePath)) return null;
  const raw = fs.readFileSync(filePath, 'utf8');
  if (filePath.endsWith('.json')) return JSON.parse(raw);
  return yaml.load(raw);
}

/**
 * Returns true if a property schema is optional due to x-oas-optional: true
 * (emitted by schema.maybe()) on its resolved type.
 *
 * Note: only detects the $ref case. Inline x-oas-optional (no $ref) does exist
 * (~30 occurrences in the bundles) but none currently sit inside a parent required
 * array, so there is no active bug. If that changes, also check
 * propSchema['x-oas-optional'] directly.
 */
function isXOasOptional(propSchema, optionalSchemas) {
  if (!propSchema?.$ref) return false;
  const m = propSchema.$ref.match(/^#\/components\/schemas\/(.+)$/);
  return m ? optionalSchemas.has(m[1]) : false;
}

/**
 * Returns true if a property schema is optional because its resolved type
 * declares a default value (emitted by the defaultValue option in
 * @kbn/config-schema). Such fields can be omitted by callers; the server
 * applies the default. Checks both inline schemas and $ref targets.
 */
function hasDefaultValue(propSchema, defaultSchemas) {
  if (!propSchema) return false;
  if (propSchema.default !== undefined) return true;
  if (propSchema.$ref) {
    const m = propSchema.$ref.match(/^#\/components\/schemas\/(.+)$/);
    return m ? defaultSchemas.has(m[1]) : false;
  }
  return false;
}

/** Walk a spec object recursively, collecting required-field bugs. */
function collectBugs(spec) {
  const componentSchemas = spec.components?.schemas || {};

  // Category 1: schemas marked x-oas-optional (from schema.maybe())
  const optionalSchemas = new Set();
  for (const [name, schema] of Object.entries(componentSchemas)) {
    if (schema['x-oas-optional'] === true) optionalSchemas.add(name);
  }

  // Category 2: schemas that declare a default value (from defaultValue option)
  const defaultSchemas = new Set();
  for (const [name, schema] of Object.entries(componentSchemas)) {
    if (schema.default !== undefined) defaultSchemas.add(name);
  }

  const bugs = []; // { jsonpath, buggyFields, correctRequired }

  function walk(node, jsonpath) {
    if (!node || typeof node !== 'object' || Array.isArray(node)) return;

    if (node.properties && Array.isArray(node.required) && node.required.length > 0) {
      const buggy = node.required.filter(
        (f) =>
          isXOasOptional(node.properties[f], optionalSchemas) ||
          hasDefaultValue(node.properties[f], defaultSchemas)
      );
      if (buggy.length > 0) {
        const correct = node.required.filter(
          (f) =>
            !isXOasOptional(node.properties[f], optionalSchemas) &&
            !hasDefaultValue(node.properties[f], defaultSchemas)
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
      `    description: "Remove wrongly-required fields (x-oas-optional or has default): ${buggyFields.join(
        ', '
      )}"`
    );
    lines.push('    remove: true');
    lines.push(`  - target: "${target}"`);
    lines.push('    description: "Restore required array without optional fields"');
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
    '# Fixes two categories of wrongly-required fields in the OAS bundles:',
    '#   1. x-oas-optional — schema.maybe() emits x-oas-optional: true on the resolved',
    '#      type schema, but the OAS generator still lists the field in required.',
    '#   2. default-value — schema.object/etc. with defaultValue emits default: on the',
    '#      resolved schema (the field is optional at runtime), but the OAS generator',
    '#      still lists it in required.',
    '# Each fix uses remove + update because the Bump overlay engine appends arrays',
    "# on 'update' alone rather than replacing them.",
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
