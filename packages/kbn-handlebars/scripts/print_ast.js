#!/usr/bin/env node
/*
 * Elasticsearch B.V licenses this file to you under the MIT License.
 * See `packages/kbn-handlebars/LICENSE` for more information.
 */
'use strict'; // eslint-disable-line strict

const { inspect } = require('util');

const { parse } = require('handlebars');

const template = process.argv[2];
const filter = (process.argv[3] || 'loc').split(',');
const containsSubNodes = ['body', 'path', 'program', 'params'];

if (template === undefined) {
  console.log(`Usage: ${process.argv[1]} <template> <filter>`);
  console.log();
  console.log(
    'By default, <filter> will be "loc", but can be set to any comma separated list of keys to filter from the output'
  );
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

    for (const k of containsSubNodes) {
      if (k in ast) {
        ast[k] = reduce(ast[k]);
      }
    }
  }

  return ast;
}
