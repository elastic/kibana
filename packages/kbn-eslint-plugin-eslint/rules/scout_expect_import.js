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

/**
 * Checks if a specifier is an expect import.
 * @param {import("@typescript-eslint/typescript-estree").TSESTree.ImportSpecifier} specifier
 * @returns {boolean}
 */
const isExpectSpecifier = (specifier) => {
  return (
    specifier.type === 'ImportSpecifier' &&
    specifier.imported &&
    specifier.imported.name === 'expect'
  );
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

        const hasExpectImport = node.specifiers.some(isExpectSpecifier);

        if (!hasExpectImport) {
          return;
        }

        if (source === recommendedImport) {
          return;
        }

        // Get all specifiers except 'expect'
        const otherSpecifiers = node.specifiers.filter(
          (specifier) => !isExpectSpecifier(specifier)
        );

        const expectSpecifier = node.specifiers.find(isExpectSpecifier);

        context.report({
          node: node.source,
          messageId: 'wrongImportPath',
          data: {
            testType,
            recommendedImport,
            actualImport: source,
          },
          fix(fixer) {
            const sourceText = context.getSourceCode();
            // Preserve the alias if present (e.g., "expect as e" or just "expect")
            const importedName = expectSpecifier.imported?.name || 'expect';
            const localName = expectSpecifier.local?.name;
            const expectImportSpecifier =
              localName && localName !== importedName
                ? `${importedName} as ${localName}`
                : importedName;

            // Check if there's already an import from the recommended package
            const ast = sourceText.ast;
            const existingImport = ast.body.find(
              (stmt) =>
                stmt.type === 'ImportDeclaration' &&
                stmt.source.value === recommendedImport &&
                stmt !== node
            );

            // If expect is the only import, replace the whole import with the correct one
            if (otherSpecifiers.length === 0) {
              // If there's an existing import from the correct package, add expect to it and remove this one
              if (existingImport) {
                const existingSpecifiers = existingImport.specifiers || [];
                const hasExpectAlready = existingSpecifiers.some(isExpectSpecifier);
                if (hasExpectAlready) {
                  // Already has expect, just remove this import
                  return fixer.remove(node);
                }
                // Add expect to existing import
                const existingSpecifiersText = existingSpecifiers
                  .map((spec) => sourceText.getText(spec))
                  .join(', ');
                const newSpecifiersText = existingSpecifiersText
                  ? `${existingSpecifiersText}, ${expectImportSpecifier}`
                  : expectImportSpecifier;
                const updatedImport = `import { ${newSpecifiersText} } from '${recommendedImport}';`;
                return [fixer.remove(node), fixer.replaceText(existingImport, updatedImport)];
              }
              // No existing import, just replace this one
              return fixer.replaceText(
                node,
                `import { ${expectImportSpecifier} } from '${recommendedImport}';`
              );
            }

            // If there are other imports, remove expect from the existing import
            const fixes = [];

            // Build the new import without expect
            let newImportText = 'import ';
            const defaultSpec = otherSpecifiers.find((s) => s.type === 'ImportDefaultSpecifier');
            const namespaceSpec = otherSpecifiers.find(
              (s) => s.type === 'ImportNamespaceSpecifier'
            );
            const namedSpecs = otherSpecifiers.filter((s) => s.type === 'ImportSpecifier');

            if (defaultSpec) {
              newImportText += sourceText.getText(defaultSpec);
            }
            if (namespaceSpec) {
              newImportText += defaultSpec ? ', ' : '';
              newImportText += sourceText.getText(namespaceSpec);
            }
            if (namedSpecs.length > 0) {
              const namedText = namedSpecs.map((spec) => sourceText.getText(spec)).join(', ');
              if (defaultSpec || namespaceSpec) {
                newImportText += `, { ${namedText} }`;
              } else {
                newImportText += `{ ${namedText} }`;
              }
            }
            newImportText += ` from ${sourceText.getText(node.source)};`;

            // Replace the existing import (without expect)
            fixes.push(fixer.replaceText(node, newImportText));

            // Check if we should add to existing import or create new one
            if (existingImport) {
              const existingSpecifiers = existingImport.specifiers || [];
              const hasExpectAlready = existingSpecifiers.some(isExpectSpecifier);
              if (!hasExpectAlready) {
                // Add expect to existing import
                const existingSpecifiersText = existingSpecifiers
                  .map((spec) => sourceText.getText(spec))
                  .join(', ');
                const newSpecifiersText = existingSpecifiersText
                  ? `${existingSpecifiersText}, ${expectImportSpecifier}`
                  : expectImportSpecifier;
                const updatedImport = `import { ${newSpecifiersText} } from '${recommendedImport}';`;
                fixes.push(fixer.replaceText(existingImport, updatedImport));
              }
              // If expect already exists in the correct import, we don't need to add it
            } else {
              // No existing import, create a new one
              const newExpectImport = `import { ${expectImportSpecifier} } from '${recommendedImport}';`;
              fixes.push(fixer.insertTextAfterRange(node.range, `\n${newExpectImport}`));
            }

            return fixes;
          },
        });
      },
    };
  },
};
