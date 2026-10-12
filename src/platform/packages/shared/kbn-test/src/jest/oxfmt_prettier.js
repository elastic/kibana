/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/**
 * The subset of the Prettier 2 API that jest-snapshot 29 drives through the `prettierPath` option
 * when it writes inline snapshots, backed by oxfmt.
 *
 * jest-snapshot calls `format()` twice per test file: once to format the file after the snapshot
 * template literals are inserted, and once with a custom `parser` function that re-indents each
 * snapshot to match the indentation of its `expect()` call. Without a module here jest-snapshot 29
 * writes the snapshot content flush-left instead.
 *
 * Loaded by jest-snapshot with a plain `require()` outside the test module registry, so this must
 * stay CommonJS and free of TypeScript.
 */

const { execFileSync } = require('child_process');
const Path = require('path');
const { parse } = require('@babel/parser');
const { REPO_ROOT } = require('@kbn/repo-info');
const { bin } = require('oxfmt/package.json');

const OXFMT_BIN_PATH = Path.join(Path.dirname(require.resolve('oxfmt/package.json')), bin.oxfmt);
const OXFMT_CONFIG_PATH = Path.join(REPO_ROOT, '.oxfmtrc.json');

const inferParser = (filepath) => (/\.tsx?$/.test(filepath) ? 'typescript' : 'babel');

const formatWithOxfmt = (filepath, text) =>
  execFileSync(
    process.execPath,
    [
      OXFMT_BIN_PATH,
      '--config',
      OXFMT_CONFIG_PATH,
      `--stdin-filepath=${Path.relative(REPO_ROOT, filepath)}`,
    ],
    { cwd: REPO_ROOT, input: text, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 }
  );

/**
 * Parse `text` into a Babel AST and remember where every template literal argument sits, so that
 * the template literals jest-snapshot swaps in (which carry no location) can be written back into
 * the original source without reprinting the whole file.
 */
const parseTrackingTemplateArgs = (text, filepath) => {
  const ast = parse(text, {
    sourceType: 'module',
    plugins: [
      'typescript',
      'decorators-legacy',
      ...(/\.(tsx|jsx?|mjs)$/.test(filepath) ? ['jsx'] : []),
    ],
  });

  const templateArgs = [];
  const visit = (node) => {
    if (!node || typeof node.type !== 'string') {
      return;
    }

    if (node.type === 'CallExpression') {
      node.arguments.forEach((arg, index) => {
        if (arg.type === 'TemplateLiteral') {
          templateArgs.push({ call: node, index, original: arg, start: arg.start, end: arg.end });
        }
      });
    }

    for (const key of Object.keys(node)) {
      if (key === 'loc' || key === 'leadingComments' || key === 'trailingComments') {
        continue;
      }
      const value = node[key];
      if (Array.isArray(value)) {
        value.forEach(visit);
      } else if (value && typeof value.type === 'string') {
        visit(value);
      }
    }
  };
  visit(ast.program);

  return { ast, templateArgs };
};

const applyReplacedTemplateArgs = (text, templateArgs) =>
  templateArgs
    .filter(({ call, index, original }) => call.arguments[index] !== original)
    .sort((a, b) => b.start - a.start)
    .reduce(
      (source, { call, index, start, end }) =>
        `${source.slice(0, start)}\`${call.arguments[index].quasis[0].value.raw}\`${source.slice(
          end
        )}`,
      text
    );

module.exports = {
  version: '2.0.0-oxfmt',

  resolveConfig: {
    sync: () => ({ tabWidth: 2, useTabs: false }),
  },

  getFileInfo: {
    sync: (filepath) => ({ inferredParser: inferParser(filepath) }),
  },

  format(text, options) {
    const { filepath, parser } = options;

    if (typeof parser !== 'function') {
      return formatWithOxfmt(filepath, text);
    }

    const { ast, templateArgs } = parseTrackingTemplateArgs(text, filepath);
    parser(text, { [inferParser(filepath)]: () => ast }, options);
    return applyReplacedTemplateArgs(text, templateArgs);
  },
};
