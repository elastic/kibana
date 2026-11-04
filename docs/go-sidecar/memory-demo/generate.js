#!/usr/bin/env node

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

const NUM_FILES = 1000;
const FUNCS_PER_FILE = 100;

const BASE_DIR = __dirname;
const NODE_DIR = path.join(BASE_DIR, 'node-server');
const GO_DIR = path.join(BASE_DIR, 'go-server');

const GO_MODULE = 'memory-demo';

function pad(n, width) {
  return String(n).padStart(width, '0');
}

function generateNodeFunc(i) {
  return [
    `exports.fn_${i} = function(a, b) {`,
    `  let result = 0;`,
    `  for (let i = 0; i < a; i++) {`,
    `    result += b * (i + ${i});`,
    `  }`,
    `  if (result > 1000) {`,
    `    result = result % ${1000 + i};`,
    `  }`,
    `  return result + ${i};`,
    `};`,
    ``,
  ].join('\n');
}

function generateGoFunc(i) {
  return [
    `func Fn${i}(a, b int) int {`,
    `\tresult := 0`,
    `\tfor i := 0; i < a; i++ {`,
    `\t\tresult += b * (i + ${i})`,
    `\t}`,
    `\tif result > 1000 {`,
    `\t\tresult = result % ${1000 + i}`,
    `\t}`,
    `\treturn result + ${i}`,
    `}`,
    ``,
  ].join('\n');
}

function generateNodeProject() {
  console.log('Generating Node.js project...');
  const genDir = path.join(NODE_DIR, 'gen');
  fs.mkdirSync(genDir, { recursive: true });

  const requires = [];
  const calls = [];
  let totalLines = 0;

  for (let f = 0; f < NUM_FILES; f++) {
    const modName = `mod_${pad(f, 4)}`;
    const lines = ["'use strict';", ''];
    for (let i = 0; i < FUNCS_PER_FILE; i++) {
      lines.push(generateNodeFunc(i));
    }
    const content = lines.join('\n');
    totalLines += content.split('\n').length;
    fs.writeFileSync(path.join(genDir, `${modName}.js`), content);

    requires.push(`const ${modName} = require('./gen/${modName}');`);
    calls.push(`  sum += ${modName}.fn_0(1, 2);`);

    if ((f + 1) % 100 === 0) {
      process.stdout.write(`  ${f + 1}/${NUM_FILES} modules\r`);
    }
  }
  console.log(`  ${NUM_FILES}/${NUM_FILES} modules`);

  const serverLines = [
    "'use strict';",
    "const http = require('http');",
    '',
    ...requires,
    '',
    'const server = http.createServer((req, res) => {',
    "  if (req.url === '/health') {",
    '    let sum = 0;',
    ...calls,
    "    res.writeHead(200, { 'Content-Type': 'application/json' });",
    "    res.end(JSON.stringify({ status: 'ok', sum }));",
    '  } else {',
    '    res.writeHead(404);',
    "    res.end('not found');",
    '  }',
    '});',
    '',
    'server.listen(3001, () => {',
    "  console.log('Node.js server ready on :3001');",
    '});',
    '',
  ];
  totalLines += serverLines.length;
  fs.writeFileSync(path.join(NODE_DIR, 'server.js'), serverLines.join('\n'));

  console.log(`  Node.js total: ~${totalLines.toLocaleString()} lines`);
}

function generateGoProject() {
  console.log('Generating Go project...');

  const imports = [];
  const calls = [];
  let totalLines = 0;

  for (let f = 0; f < NUM_FILES; f++) {
    const pkgName = `pkg${pad(f, 4)}`;
    const pkgDir = path.join(GO_DIR, 'gen', pkgName);
    fs.mkdirSync(pkgDir, { recursive: true });

    const lines = [`package ${pkgName}`, ''];
    for (let i = 0; i < FUNCS_PER_FILE; i++) {
      lines.push(generateGoFunc(i));
    }
    const content = lines.join('\n');
    totalLines += content.split('\n').length;
    fs.writeFileSync(path.join(pkgDir, `${pkgName}.go`), content);

    imports.push(`\t"${GO_MODULE}/gen/${pkgName}"`);
    calls.push(`\tsum += ${pkgName}.Fn0(1, 2)`);

    if ((f + 1) % 100 === 0) {
      process.stdout.write(`  ${f + 1}/${NUM_FILES} packages\r`);
    }
  }
  console.log(`  ${NUM_FILES}/${NUM_FILES} packages`);

  const goMod = [`module ${GO_MODULE}`, '', 'go 1.21', ''].join('\n');
  fs.writeFileSync(path.join(GO_DIR, 'go.mod'), goMod);

  const mainLines = [
    'package main',
    '',
    'import (',
    '\t"fmt"',
    '\t"net/http"',
    '',
    ...imports,
    ')',
    '',
    'func main() {',
    '\thttp.HandleFunc("/health", func(w http.ResponseWriter, r *http.Request) {',
    '\t\tsum := 0',
    ...calls,
    '\t\tw.Header().Set("Content-Type", "application/json")',
    '\t\tfmt.Fprintf(w, `{"status":"ok","sum":%d}`, sum)',
    '\t})',
    '',
    '\tfmt.Println("Go server ready on :3002")',
    '\thttp.ListenAndServe(":3002", nil)',
    '}',
    '',
  ];
  totalLines += mainLines.length;
  fs.writeFileSync(path.join(GO_DIR, 'main.go'), mainLines.join('\n'));

  console.log(`  Go total: ~${totalLines.toLocaleString()} lines`);
}

function clean() {
  console.log('Cleaning previous output...');
  fs.rmSync(NODE_DIR, { recursive: true, force: true });
  fs.rmSync(GO_DIR, { recursive: true, force: true });
}

const start = Date.now();
clean();
generateNodeProject();
generateGoProject();
const elapsed = ((Date.now() - start) / 1000).toFixed(1);
console.log(`\nDone in ${elapsed}s`);
