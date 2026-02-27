/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

const fs = require('fs');
const path = require('path');

const PKG_ROOT = path.resolve(__dirname, '..');
const SOURCE = path.join(PKG_ROOT, 'search_agent_instructions.ts');
const TARGET = path.join(PKG_ROOT, '.elasticsearch-agent', 'AGENTS.md');

const source = fs.readFileSync(SOURCE, 'utf-8');

const startMarker = 'export const searchAgentInstructions = `';
const startIdx = source.indexOf(startMarker);
if (startIdx === -1) {
  console.error('Could not find searchAgentInstructions template literal in', SOURCE);
  process.exit(1);
}

const contentStart = startIdx + startMarker.length;
const contentEnd = source.lastIndexOf('`;');
if (contentEnd === -1 || contentEnd <= contentStart) {
  console.error('Could not find closing backtick for template literal in', SOURCE);
  process.exit(1);
}

const markdown = source
  .slice(contentStart, contentEnd)
  .replace(/\\\\/g, '\\')
  .replace(/\\`/g, '`')
  .replace(/\\\$/g, '$');

fs.mkdirSync(path.dirname(TARGET), { recursive: true });
fs.writeFileSync(TARGET, markdown + '\n');

console.log('Generated', path.relative(PKG_ROOT, TARGET));
