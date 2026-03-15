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
const SOURCE_MD = path.join(PKG_ROOT, 'search_agent_instructions.md');
const TARGET_TS = path.join(PKG_ROOT, 'search_agent_instructions.ts');
const TARGET_MD = path.join(PKG_ROOT, '.elasticsearch-agent', 'AGENTS.md');

const LICENSE_HEADER = `/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */`;

const markdown = fs.readFileSync(SOURCE_MD, 'utf-8');

const escaped = markdown
  .trimEnd()
  .replace(/\\/g, '\\\\')
  .replace(/`/g, '\\`')
  .replace(/\$/g, '\\$');

const tsContent = [
  LICENSE_HEADER,
  '',
  '// @generated — DO NOT EDIT DIRECTLY. Edit search_agent_instructions.md and run ./build',
  '',
  `export const searchAgentInstructions = \`${escaped}\`;`,
  '',
].join('\n');

fs.writeFileSync(TARGET_TS, tsContent);
console.log('Generated', path.relative(PKG_ROOT, TARGET_TS));

fs.mkdirSync(path.dirname(TARGET_MD), { recursive: true });
fs.copyFileSync(SOURCE_MD, TARGET_MD);
console.log('Generated', path.relative(PKG_ROOT, TARGET_MD));
