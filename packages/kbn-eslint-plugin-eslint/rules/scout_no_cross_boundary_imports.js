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

const PLATFORM_PACKAGE = '@kbn/scout';

const SOLUTION_PACKAGES = {
  observability: '@kbn/scout-oblt',
  search: '@kbn/scout-search',
  security: '@kbn/scout-security',
};

/**
 * Determines which Scout package boundary a file belongs to.
 * @param {string} filePath
 * @returns {{ type: 'platform' | 'solution' | 'platform_test' | 'solution_test', solution?: string, package: string, isBridgeFile?: boolean } | null}
 */
const getBoundary = (filePath) => {
  // Solution Scout package (src/ files and bridge files like index.ts, api.ts, ui.ts)
  const solutionPkgMatch = filePath.match(
    /x-pack\/solutions\/(\w+)\/packages\/kbn-scout-\w+\/(.*)/
  );
  if (solutionPkgMatch) {
    const solution = solutionPkgMatch[1];
    const pkg = SOLUTION_PACKAGES[solution];
    if (pkg) {
      return {
        type: 'solution',
        solution,
        package: pkg,
        isBridgeFile: !solutionPkgMatch[2].startsWith('src/'),
      };
    }
  }

  // Platform Scout package
  if (/src\/platform\/packages\/shared\/kbn-scout\//.test(filePath)) {
    return { type: 'platform', package: PLATFORM_PACKAGE };
  }

  // Solution plugin test files
  const solutionTestMatch = filePath.match(
    /x-pack\/solutions\/(\w+)\/plugins\/.*\/test\/(?:scout|scout_\w+)\//
  );
  if (solutionTestMatch) {
    const solution = solutionTestMatch[1];
    const pkg = SOLUTION_PACKAGES[solution];
    if (pkg) {
      return { type: 'solution_test', solution, package: pkg };
    }
  }

  // Platform plugin test files (both src/platform and x-pack/platform)
  if (
    /(?:src\/platform|x-pack\/platform)\/(?:.*\/)?plugins\/.*\/test\/(?:scout|scout_\w+)\//.test(
      filePath
    )
  ) {
    return { type: 'platform_test', package: PLATFORM_PACKAGE };
  }

  return null;
};

/**
 * Checks if an import source is a Scout package and identifies which one.
 * @param {string} source
 * @returns {{ type: 'platform' | 'solution', solution?: string, package: string } | null}
 */
const identifyScoutImport = (source) => {
  for (const [solution, pkg] of Object.entries(SOLUTION_PACKAGES)) {
    if (source === pkg || source.startsWith(pkg + '/')) {
      return { type: 'solution', solution, package: pkg };
    }
  }

  if (source === PLATFORM_PACKAGE || source.startsWith(PLATFORM_PACKAGE + '/')) {
    return { type: 'platform', package: PLATFORM_PACKAGE };
  }

  return null;
};

/** @type {Rule} */
module.exports = {
  meta: {
    type: 'problem',
    docs: {
      description:
        'Prevent cross-boundary imports between Scout packages. Solution-specific Scout packages must not import from other solutions or directly from the platform Scout package, and the platform must not import from solution packages.',
      category: 'Best Practices',
    },
    schema: [],
    messages: {
      crossSolutionImport:
        "Solution Scout package '{{ownPackage}}' must not import from '{{importedPackage}}'. Each solution's Scout package must remain independent of other solutions.",
      solutionToPlatformImport:
        "Files in '{{ownPackage}}/src/' should not import from '{{importSource}}'. Use relative imports for platform types and utilities instead.",
      platformToSolutionImport:
        "Platform Scout package '{{ownPackage}}' must not import from solution-specific package '{{importedPackage}}'.",
      wrongTestImport:
        "Test files in this {{area}} should import from '{{allowedPackage}}' instead of '{{importSource}}'.",
    },
  },

  create(context) {
    const filePath = context.getFilename();
    const boundary = getBoundary(filePath);

    if (!boundary) {
      return {};
    }

    const checkModuleSource = (sourceNode) => {
      const source = sourceNode.value;
      const importTarget = identifyScoutImport(source);

      if (!importTarget) {
        return;
      }

      // Test files must only import from their allowed Scout package
      if (boundary.type === 'solution_test' || boundary.type === 'platform_test') {
        if (importTarget.package !== boundary.package) {
          context.report({
            node: sourceNode,
            messageId: 'wrongTestImport',
            data: {
              area:
                boundary.type === 'solution_test' ? `${boundary.solution} solution` : 'platform',
              allowedPackage: boundary.package,
              importSource: source,
            },
          });
        }
        return;
      }

      if (boundary.type === 'solution') {
        // Cross-solution imports are always forbidden
        if (importTarget.type === 'solution' && importTarget.solution !== boundary.solution) {
          context.report({
            node: sourceNode,
            messageId: 'crossSolutionImport',
            data: {
              ownPackage: boundary.package,
              importedPackage: importTarget.package,
            },
          });
          return;
        }

        // Solution src/ files should not import from platform Scout
        // Bridge files (root-level index.ts, api.ts, ui.ts) are exempt
        if (importTarget.type === 'platform' && !boundary.isBridgeFile) {
          context.report({
            node: sourceNode,
            messageId: 'solutionToPlatformImport',
            data: {
              ownPackage: boundary.package,
              importSource: source,
            },
          });
        }
        return;
      }

      if (boundary.type === 'platform') {
        // Platform must not import from any solution Scout package
        if (importTarget.type === 'solution') {
          context.report({
            node: sourceNode,
            messageId: 'platformToSolutionImport',
            data: {
              ownPackage: boundary.package,
              importedPackage: importTarget.package,
            },
          });
        }
      }
    };

    return {
      ImportDeclaration(node) {
        checkModuleSource(node.source);
      },
      ExportNamedDeclaration(node) {
        if (node.source) {
          checkModuleSource(node.source);
        }
      },
      ExportAllDeclaration(node) {
        if (node.source) {
          checkModuleSource(node.source);
        }
      },
    };
  },
};
