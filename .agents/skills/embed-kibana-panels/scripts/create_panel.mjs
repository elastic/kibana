#!/usr/bin/env node
/**
 * Validate and echo a panel spec as JSON.
 *
 * Usage:
 *   node create_panel.mjs <type> <spec.json>
 *
 * Types: heatmap, bar, table
 *
 * Validates required fields for the given type and prints the spec (with
 * defaults applied) to stdout, ready to be embedded in a page spec.
 */

import { readFileSync } from 'fs';

function fail(msg) {
  console.error(`[create_panel] ${msg}`);
  process.exit(1);
}

const [, , type, specPath] = process.argv;
if (!type || !specPath) fail('usage: create_panel.mjs <type> <spec.json>');

const spec = JSON.parse(readFileSync(specPath, 'utf8'));

const REQUIRED = {
  heatmap: ['title', 'esql', 'x', 'y', 'value'],
  bar: ['title', 'esql', 'category', 'value'],
  table: ['title', 'esql'],
};

const required = REQUIRED[type];
if (!required) fail(`unsupported type "${type}"; supported: ${Object.keys(REQUIRED).join(', ')}`);

for (const field of required) {
  if (!spec[field]) fail(`spec is missing required field "${field}" for type "${type}"`);
}

const panel = { type, height: 500, ...spec };
process.stdout.write(JSON.stringify(panel, null, 2) + '\n');
