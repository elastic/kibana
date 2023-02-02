/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

const Path = require('path');

const T = require('@babel/types');
const normalizePath = require('normalize-path');
const { declare } = require('@babel/helper-plugin-utils');
const { readPackageMap } = require('@kbn/repo-packages');
const { REPO_ROOT } = require('@kbn/repo-info');

const PKG_MAP = readPackageMap();

/**
 * @param {unknown} v
 * @returns {v is Record<string, unknown>}
 */
const isObj = (v) => typeof v === 'object' && !!v;

/**
 * @param {unknown} state
 * @returns {string}
 */
function getFilename(state) {
  if (!isObj(state) || typeof state.filename !== 'string' || !Path.isAbsolute(state.filename)) {
    throw new Error(
      `@kbn/babel-plugin-package-imports is only compatible when building files with absolute filename state`
    );
  }

  return state.filename;
}

/**
 * @param {string} req
 * @returns {import('./types').ParsedReq | undefined}
 */
function parseReq(req) {
  if (!req.startsWith('@kbn/')) {
    return;
  }

  const parts = req.split('/');
  const moduleId = `@kbn/${parts[1]}`;
  const dir = PKG_MAP.get(moduleId);
  if (!dir) {
    return;
  }

  return {
    req,
    moduleId,
    dir,
    subParts: parts.slice(2),
  };
}

/**
 * @param {import('./types').ParsedReq} req
 * @param {string} filename
 */
function fixImportRequest(req, filename) {
  if (process.env.BAZEL_WORKSPACE === 'kibana') {
    return;
  }

  const rel = normalizePath(
    Path.relative(Path.dirname(filename), Path.resolve(REPO_ROOT, req.dir, ...req.subParts))
  );

  return rel.startsWith('.') ? rel : `./${rel}`;
}

/**
 * @param {T.CallExpression} node
 * @returns {node is T.Import & { arguments: [T.StringLiteral] }}
 */
function isDynamicImport(node) {
  return !!(
    T.isImport(node.callee) &&
    node.arguments.length === 1 &&
    T.isStringLiteral(node.arguments[0])
  );
}

/**
 * @param {T.CallExpression} node
 * @returns {node is T.CallExpression & { arguments: [T.StringLiteral] }}
 */
function isRequire(node) {
  return !!(
    T.isIdentifier(node.callee) &&
    node.callee.name === 'require' &&
    node.arguments.length >= 1 &&
    T.isStringLiteral(node.arguments[0])
  );
}

/**
 * @param {T.CallExpression} node
 * @returns {node is T.CallExpression & { arguments: [T.StringLiteral] }}
 */
function isRequireResolve(node) {
  return !!(
    T.isMemberExpression(node.callee) &&
    T.isIdentifier(node.callee.object) &&
    node.callee.object.name === 'require' &&
    T.isIdentifier(node.callee.property) &&
    node.callee.property.name === 'resolve' &&
    node.arguments.length >= 1 &&
    T.isStringLiteral(node.arguments[0])
  );
}

/**
 * @param {T.CallExpression} node
 * @returns {node is T.CallExpression & { arguments: [T.StringLiteral] }}
 */
function isJestMockCall(node) {
  return !!(
    T.isMemberExpression(node.callee) &&
    T.isIdentifier(node.callee.object) &&
    node.callee.object.name === 'jest' &&
    node.arguments.length >= 1 &&
    T.isStringLiteral(node.arguments[0])
  );
}

module.exports = declare((api, options) => {
  /** @type {Set<string> | undefined} */
  const ignoredPkgIds = options.ignoredPkgIds;

  api.assertVersion(7);

  return {
    name: 'kbn-package-imports',
    visitor: {
      /**
       * @param {import('@babel/core').NodePath<T.ImportDeclaration | T.ExportNamedDeclaration | T.ExportAllDeclaration>} path
       */
      'ImportDeclaration|ExportNamedDeclaration|ExportAllDeclaration'(path) {
        const filename = getFilename(this);

        const source = path.node.source;
        if (!T.isStringLiteral(source)) {
          return;
        }

        const req = source.value;
        const parsed = parseReq(req);
        if (!parsed || ignoredPkgIds?.has(parsed.moduleId)) {
          return;
        }

        const newReq = fixImportRequest(parsed, filename);
        if (newReq) {
          path.get('source').replaceWith(T.stringLiteral(newReq));
        }
      },

      /**
       * @param {import('@babel/core').NodePath<T.CallExpression>} path
       */
      CallExpression(path) {
        const filename = getFilename(this);

        const { node } = path;
        if (
          !isDynamicImport(node) &&
          !isRequire(node) &&
          !isRequireResolve(node) &&
          !isJestMockCall(node)
        ) {
          return;
        }

        const req = node.arguments[0].value;
        const parsed = parseReq(req);
        if (!parsed || ignoredPkgIds?.has(parsed.moduleId)) {
          return;
        }

        const newReq = fixImportRequest(parsed, filename);
        if (newReq) {
          path.get('arguments')[0].replaceWith(T.stringLiteral(newReq));
        }
      },
    },
  };
});
