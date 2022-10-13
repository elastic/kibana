/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

/** @typedef {import('@babel/core').PluginObj} PluginObj */

const Path = require('path');
const Fs = require('fs');

const T = require('@babel/types');
const normalizePath = require('normalize-path');
const { declare } = require('@babel/helper-plugin-utils');
const KbnSyntheticPackageMap = require('@kbn/synthetic-package-map');

const PKG_MAP = KbnSyntheticPackageMap.readPackageMap();
const PKG_MAP_HASH = KbnSyntheticPackageMap.readHashOfPackageMap();

function getFilename(state) {
  if (typeof state !== 'object' || !state || !state.filename || !Path.isAbsolute(state.filename)) {
    throw new Error(
      `@kbn/babel-plugin-synthetic-packages is only compatible when building files with absolute filename state`
    );
  }

  return state.filename;
}

let foundKibanaRoot;
function getKibanaRoot(someSourceFilename) {
  if (foundKibanaRoot) {
    return foundKibanaRoot;
  }

  // try to find the Kibana package.json file in a parent directory of the sourceFile
  let cursorDir = Path.dirname(someSourceFilename);
  while (true) {
    const packageJsonPath = Path.resolve(cursorDir, 'package.json');
    try {
      const pkg = JSON.parse(Fs.readFileSync(packageJsonPath, 'utf8'));
      if (pkg && pkg.name === 'kibana') {
        foundKibanaRoot = cursorDir;
        return foundKibanaRoot;
      }
    } catch {
      // this directory is not the Kibana dir
    }

    const nextCursor = Path.dirname(cursorDir);
    if (!nextCursor || nextCursor === cursorDir) {
      // stop iterating when we get to the root of the root of the filesystem
      break;
    }

    cursorDir = nextCursor;
  }

  throw new Error(
    '@kbn/*-plugin and @kbn/core imports can only be used by source files which have not been converted to packages, building packages which rely on these imports requires converting the thing you want into a package.'
  );
}

function fixImportRequest(req, filename, kibanaRoot) {
  if (!req.startsWith('@kbn/')) {
    return;
  }

  const parts = req.split('/');
  const dir = PKG_MAP.get(`@kbn/${parts[1]}`);
  if (!dir) {
    return;
  }

  return normalizePath(
    Path.relative(
      Path.dirname(filename),
      Path.resolve(kibanaRoot ?? getKibanaRoot(filename), dir, ...parts.slice(2))
    )
  );
}

/**
 * @param {T.CallExpression} node
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
  const kibanaRoot = options['kibana/rootDir'];

  api.assertVersion(7);
  api.cache.using(() => `${PKG_MAP_HASH}:${kibanaRoot}`);

  /** @type {PluginObj} */
  const plugin = {
    name: 'synthetic-packages',
    visitor: {
      'ImportDeclaration|ExportNamedDeclaration|ExportAllDeclaration'(path) {
        const filename = getFilename(this);

        const source = path.node.source;
        if (!T.isStringLiteral(source)) {
          return;
        }

        const req = source.value;
        const newReq = fixImportRequest(req, filename, kibanaRoot);
        if (newReq) {
          path.get('source').replaceWith(T.stringLiteral(newReq));
        }
      },
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
        const newReq = fixImportRequest(req, filename, kibanaRoot);
        if (newReq) {
          path.get('arguments.0').replaceWith(T.stringLiteral(newReq));
        }
      },
    },
  };

  return plugin;
});
