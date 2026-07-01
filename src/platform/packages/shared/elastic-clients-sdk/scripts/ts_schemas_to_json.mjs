#!/usr/bin/env node
/**
 * One-time migration script: converts flat es/schemas/*.ts files to *.json.
 *
 * A "flat" schema file is one that was already converted from Zod to a plain
 * JSON object literal (no import statements) by convert_zod_to_json_schema.ts.
 * These are the schemas referenced by per-endpoint api files (stems matching
 * an es/apis/*.ts file).
 *
 * For each such file the script:
 *   1. Extracts the JSON object (strips the TS export wrapper and license header).
 *   2. Writes the object as a .json file.
 *   3. Deletes the original .ts file.
 *
 * Run from the kibana repo root:
 *   node src/platform/packages/shared/elastic-clients-sdk/scripts/ts_schemas_to_json.mjs
 */

import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SDK_ROOT = path.join(__dirname, '..');
const SCHEMAS_DIR = path.join(SDK_ROOT, 'es', 'schemas');
const APIS_DIR = path.join(SDK_ROOT, 'es', 'apis');

// Collect all api file stems (these correspond to referenced schemas)
const apiStems = new Set(
  fs.readdirSync(APIS_DIR)
    .filter((f) => f.endsWith('.ts') && f !== 'index.ts')
    .map((f) => f.slice(0, -3))
);

let converted = 0;
let skipped = 0;
let failed = 0;

for (const stem of [...apiStems].sort()) {
  const tsPath = path.join(SCHEMAS_DIR, `${stem}.ts`);
  if (!fs.existsSync(tsPath)) {
    // No schema file for this endpoint — it has no input parameters, skip.
    continue;
  }

  const content = fs.readFileSync(tsPath, 'utf8');

  // Skip files that still have import statements (unconverted Zod schemas).
  if (/^import\s/m.test(content)) {
    console.warn(`[skip] ${stem}.ts still contains imports (not yet converted from Zod)`);
    skipped++;
    continue;
  }

  // The file looks like:
  //   /* license */
  //   /* generated */
  //   export const XxxRequest = { ... };
  // Extract everything from the first '{' to the matching end, minus the trailing ';'.
  const start = content.indexOf('{');
  if (start === -1) {
    console.error(`[FAIL] ${stem}.ts: no object literal found`);
    failed++;
    continue;
  }

  const objStr = content.slice(start).replace(/;\s*$/, '').trimEnd();

  let parsed;
  try {
    parsed = JSON.parse(objStr);
  } catch (err) {
    console.error(`[FAIL] ${stem}.ts: JSON.parse failed: ${err.message}`);
    failed++;
    continue;
  }

  const jsonPath = path.join(SCHEMAS_DIR, `${stem}.json`);
  fs.writeFileSync(jsonPath, JSON.stringify(parsed, null, 2) + '\n', 'utf8');
  fs.unlinkSync(tsPath);

  console.log(`[ok] ${stem}`);
  converted++;
}

console.log(`\nDone. Converted: ${converted}, Skipped: ${skipped}, Failed: ${failed}`);
if (failed > 0) process.exit(1);
