#!/usr/bin/env node
/*
 * Elasticsearch B.V licenses this file to you under the MIT License.
 * See `packages/kbn-handlebars/LICENSE` for more information.
 */
'use strict'; // eslint-disable-line strict

const { relative } = require('path');
const { inspect } = require('util');

const { parse } = require('handlebars');
const argv = require('minimist')(process.argv.slice(2));

const DEFAULT_FILTER = 'loc,strip,openStrip,inverseStrip,closeStrip';

const filter = argv['show-all'] ? [''] : (argv.filter || DEFAULT_FILTER).split(',');
const hideEmpty = argv['hide-empty'] || false;
const template = argv._[0];

if (template === undefined) {
  const script = relative(process.cwd(), process.argv[1]);
  console.log(`Usage: ${script} [options] <template>`);
  console.log();
  console.log('Options:');
  console.log('  --filter=...  A comma separated list of keys to filter from the output.');
  console.log(`                Default: ${DEFAULT_FILTER}`);
  console.log('  --hide-empty  Do not display empty properties.');
  console.log('  --show-all    Do not filter out any properties. Equivalent to --filter="".');
  console.log();
  console.log('Example:');
  console.log(`  ${script} --hide-empty -- 'hello {{name}}'`);
  console.log();
  process.exit(1);
}

console.log(inspect(reduce(parse(template, filter)), { colors: true, depth: null }));

function reduce(ast) {
  if (Array.isArray(ast)) {
    for (let i = 0; i < ast.length; i++) {
      ast[i] = reduce(ast[i]);
    }
  } else {
    for (const k of filter) {
      delete ast[k];
    }

    if (hideEmpty) {
      for (const [k, v] of Object.entries(ast)) {
        if (v === undefined || v === null || (Array.isArray(v) && v.length === 0)) {
          delete ast[k];
        }
      }
    }

    for (const [k, v] of Object.entries(ast)) {
      if (typeof v === 'object' && v !== null) {
        ast[k] = reduce(v);
      }
    }
  }

  return ast;
}
