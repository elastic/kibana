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
const ELASTIC_AGENT_DIR = path.join(PKG_ROOT, '.elasticsearch-agent');
const SRC_DIR = path.join(PKG_ROOT, 'src');

const LICENSE_HEADER = `/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */`;

function generatedNotice(sourcePath) {
  return `// @generated — DO NOT EDIT DIRECTLY. Edit ${path.relative(
    PKG_ROOT,
    sourcePath
  )} and run ./build`;
}

// ---------------------------------------------------------------------------
// Minimal YAML frontmatter parser (no dependencies)
// Handles: simple scalars, block scalars (>), flow sequences (['a','b'])
// ---------------------------------------------------------------------------
function parseFrontmatter(fileContent) {
  const parts = fileContent.split(/^---\s*$/m);
  // parts[0] is empty (before first ---), parts[1] is frontmatter, parts[2]+ is body
  if (parts.length < 3) return { meta: {}, body: fileContent };

  const raw = parts[1];
  const body = parts.slice(2).join('---').trimStart();
  const meta = {};

  const lines = raw.split('\n');
  let i = 0;
  while (i < lines.length) {
    const line = lines[i];
    // Match "key: value" or "key:" (empty / block scalar marker)
    const match = line.match(/^(\w+):\s*(.*)/);
    if (!match) {
      i++;
      continue;
    }

    const key = match[1];
    const rest = match[2].trim();

    if (rest === '>') {
      // Block scalar: collect subsequent indented lines
      const bodyLines = [];
      i++;
      while (i < lines.length && (lines[i].startsWith('  ') || lines[i].trim() === '')) {
        bodyLines.push(lines[i].trim());
        i++;
      }
      meta[key] = bodyLines.filter(Boolean).join(' ');
    } else if (rest.startsWith('[')) {
      // Flow sequence: ['a', 'b', 'c'] — convert single quotes to double for JSON.parse
      try {
        meta[key] = JSON.parse(rest.replace(/'/g, '"'));
      } catch {
        meta[key] = rest;
      }
      i++;
    } else {
      meta[key] = rest;
      i++;
    }
  }

  return { meta, body };
}

// ---------------------------------------------------------------------------
// Naming helpers
// ---------------------------------------------------------------------------
function kebabToCamel(str) {
  return str.replace(/-([a-z])/g, (_, c) => c.toUpperCase());
}

function kebabToSnake(str) {
  return str.replace(/-/g, '_');
}

function escapeTemplateLiteral(str) {
  return str.trimEnd().replace(/\\/g, '\\\\').replace(/`/g, '\\`').replace(/\$/g, '\\$');
}

// ---------------------------------------------------------------------------
// Glob helpers (pure Node.js)
// ---------------------------------------------------------------------------
function findFiles(dir, filename) {
  const results = [];
  if (!fs.existsSync(dir)) return results;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      results.push(...findFiles(full, filename));
    } else if (entry.name === filename) {
      results.push(full);
    }
  }
  return results;
}

// ---------------------------------------------------------------------------
// Skill generation
// ---------------------------------------------------------------------------
function generateSkills() {
  const skillsDir = path.join(ELASTIC_AGENT_DIR, 'skills');
  const skillFiles = findFiles(skillsDir, 'SKILL.md');
  const outDir = path.join(SRC_DIR, 'skills');
  fs.mkdirSync(outDir, { recursive: true });

  const exports = [];

  for (const filePath of skillFiles) {
    const { meta, body } = parseFrontmatter(fs.readFileSync(filePath, 'utf-8'));

    const skillName = meta.name || path.basename(path.dirname(filePath));
    const camelName = kebabToCamel(skillName); // keywordSearch
    const snakeName = kebabToSnake(skillName); // keyword_search
    const varName = `${camelName}Skill`;
    const outFile = path.join(outDir, `${snakeName}.ts`);

    const id = skillName;
    const description = meta.description || '';
    const content = escapeTemplateLiteral(body);

    const fileContent = [
      LICENSE_HEADER,
      '',
      generatedNotice(filePath),
      '',
      `export const ${varName} = {`,
      `  id: '${id}',`,
      `  name: '${skillName}',`,
      `  description: '${description.replace(/'/g, "\\'")}',`,
      `  content: \`${content}\`,`,
      `};`,
      '',
    ].join('\n');

    fs.writeFileSync(outFile, fileContent);
    exports.push({ varName, snakeName });
    console.log('Generated', path.relative(PKG_ROOT, outFile));
  }

  const generatedSkillFiles = new Set(exports.map((e) => `${e.snakeName}.ts`));
  if (fs.existsSync(outDir)) {
    for (const file of fs.readdirSync(outDir)) {
      if (file === 'index.ts') continue;
      if (!file.endsWith('.ts')) continue;
      if (!generatedSkillFiles.has(file)) {
        const fullPath = path.join(outDir, file);
        fs.unlinkSync(fullPath);
        console.log('Removed stale', path.relative(PKG_ROOT, fullPath));
      }
    }
  }

  return exports;
}

// ---------------------------------------------------------------------------
// Barrel index generation
// ---------------------------------------------------------------------------
function generateBarrel(outDir, sourceDir, exports, label) {
  const varNames = exports.map(({ varName }) => varName);
  const lines = [
    LICENSE_HEADER,
    '',
    generatedNotice(sourceDir),
    '',
    ...exports.map(({ varName, snakeName }) => `import { ${varName} } from './${snakeName}';`),
    ...(varNames.length > 0 ? [`export { ${varNames.join(', ')} };`, ''] : []),
    `export const ${label} = [${varNames.join(', ')}];`,
    '',
  ];
  const outFile = path.join(outDir, 'index.ts');
  fs.writeFileSync(outFile, lines.join('\n'));
  console.log(`Generated ${label} barrel:`, path.relative(PKG_ROOT, outFile));
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------
const skillExports = generateSkills();
generateBarrel(
  path.join(SRC_DIR, 'skills'),
  path.join(ELASTIC_AGENT_DIR, 'skills'),
  skillExports,
  'skills'
);
