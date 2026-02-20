/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/** @typedef {import("eslint").Rule.RuleModule} Rule */

const SOLUTION_PACKAGES = {
  observability: '@kbn/scout-oblt',
  search: '@kbn/scout-search',
  security: '@kbn/scout-security',
};

/**
 * Determines which Scout package a test file should import from based on its path.
 * Defaults to @kbn/scout unless the file is under a supported solution (security, observability, search).
 * @param {string} filePath
 * @returns {{ solution?: string, package: string } | null}
 */
const getAllowedPackage = (filePath) => {
  // Solution plugin test files with a dedicated Scout package
  const solutionMatch = filePath.match(
    /x-pack\/solutions\/(\w+)\/plugins\/.*\/test\/(?:scout|scout_\w+)\//
  );
  if (solutionMatch) {
    const solution = solutionMatch[1];
    const pkg = SOLUTION_PACKAGES[solution];
    return { solution, package: pkg || '@kbn/scout' };
  }

  // Platform plugin test files (src/platform and x-pack/platform)
  if (
    /(?:src\/platform|x-pack\/platform)\/(?:.*\/)?plugins\/.*\/test\/(?:scout|scout_\w+)\//.test(
      filePath
    )
  ) {
    return { package: '@kbn/scout' };
  }

  return null;
};

/**
 * Extracts the base Scout package name from an import source.
 * e.g. '@kbn/scout/ui' → '@kbn/scout', '@kbn/scout-security/api' → '@kbn/scout-security'
 * @param {string} source
 * @returns {string | null}
 */
const getScoutPackage = (source) => {
  const match = source.match(/^(@kbn\/scout(?:-\w+)?)/);
  return match ? match[1] : null;
};

/** @type {Rule} */
module.exports = {
  meta: {
    type: 'problem',
    docs: {
      description:
        'Ensure Scout test files import only from their designated Scout package. Solution tests must use their solution-specific package, platform tests must use @kbn/scout.',
      category: 'Best Practices',
    },
    schema: [],
    messages: {
      platformTestImport:
        "Tests without a solution-specific Scout package should import from '@kbn/scout'.",
      solutionTestImport: "'{{solution}}' solution tests should import from '{{allowedPackage}}'.",
    },
  },

  create(context) {
    const filePath = context.getFilename();
    const allowed = getAllowedPackage(filePath);

    if (!allowed) {
      return {};
    }

    const checkSource = (sourceNode) => {
      const source = sourceNode.value;
      const scoutPkg = getScoutPackage(source);

      if (!scoutPkg || scoutPkg === allowed.package) {
        return;
      }

      context.report({
        node: sourceNode,
        messageId: allowed.solution ? 'solutionTestImport' : 'platformTestImport',
        data: {
          solution: allowed.solution,
          allowedPackage: allowed.package,
        },
      });
    };

    return {
      ImportDeclaration(node) {
        checkSource(node.source);
      },
      ExportNamedDeclaration(node) {
        if (node.source) {
          checkSource(node.source);
        }
      },
      ExportAllDeclaration(node) {
        if (node.source) {
          checkSource(node.source);
        }
      },
    };
  },
};
