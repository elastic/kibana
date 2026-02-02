/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/** @typedef {import("eslint").Rule.RuleModule} Rule */
/** @typedef {import("@typescript-eslint/typescript-estree").TSESTree.ImportDeclaration} ImportDeclaration */

const SOLUTION_PACKAGES = {
  observability: '@kbn/scout-oblt',
  search: '@kbn/scout-search',
  security: '@kbn/scout-security',
};

/**
 * Determines the test type (api/ui) based on file path.
 * @param {string} filePath
 * @returns {'api' | 'ui' | null}
 */
const getTestType = (filePath) => {
  if (/\/test\/scout\/api\//.test(filePath)) {
    return 'api';
  }
  if (/\/test\/scout\/ui\//.test(filePath)) {
    return 'ui';
  }
  return null;
};

/**
 * Gets the recommended package based on file path.
 * @param {string} filePath
 * @returns {string}
 */
const getRecommendedPackage = (filePath) => {
  const solutionMatch = filePath.match(/x-pack\/solutions\/(\w+)\//);
  if (solutionMatch) {
    const solution = solutionMatch[1];
    return SOLUTION_PACKAGES[solution] || '@kbn/scout';
  }
  return '@kbn/scout';
};

/** @type {Rule} */
module.exports = {
  meta: {
    type: 'problem',
    docs: {
      description:
        'Ensure `expect` is imported from the correct scout subpath based on test type (api/ui).',
      category: 'Best Practices',
    },
    fixable: 'code',
    schema: [],
    messages: {
      wrongImportPath:
        'Import `expect` from `{{recommendedImport}}` in {{testType}} tests. Found: `{{actualImport}}`.',
    },
  },

  create(context) {
    const filePath = context.getFilename();
    const testType = getTestType(filePath);

    if (!testType) {
      return {};
    }

    const recommendedPackage = getRecommendedPackage(filePath);
    const recommendedImport = `${recommendedPackage}/${testType}`;

    return {
      ImportDeclaration(node) {
        const source = node.source.value;

        const hasExpectImport = node.specifiers.some(
          (specifier) =>
            specifier.type === 'ImportSpecifier' &&
            specifier.imported &&
            specifier.imported.name === 'expect'
        );

        if (!hasExpectImport) {
          return;
        }

        if (source === recommendedImport) {
          return;
        }

        context.report({
          node: node.source,
          messageId: 'wrongImportPath',
          data: {
            testType,
            recommendedImport,
            actualImport: source,
          },
          fix(fixer) {
            return fixer.replaceText(node.source, `'${recommendedImport}'`);
          },
        });
      },
    };
  },
};
