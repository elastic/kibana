/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/** @typedef {import("eslint").Rule.RuleModule} Rule */
/** @typedef {import("eslint").AST.SourceLocation} SourceLocation */
/** @typedef {import("@typescript-eslint/typescript-estree").TSESTree.ImportDeclaration} ImportDeclaration */
/** @typedef {import("@typescript-eslint/typescript-estree").TSESTree.ExportNamedDeclaration} ExportNamedDeclaration */
/** @typedef {import("@typescript-eslint/typescript-estree").TSESTree.ExportAllDeclaration} ExportAllDeclaration */
/** @typedef {import("@typescript-eslint/typescript-estree").TSESTree.TSImportEqualsDeclaration} TSImportEqualsDeclaration */
/** @typedef {import("@typescript-eslint/typescript-estree").TSESTree.Identifier} Identifier */
/** @typedef {import("@typescript-eslint/typescript-estree").TSESTree.StringLiteral} StringLiteral */
/** @typedef {{ name: string, message: string, importNames?: string[] }} RestrictedPath */

const restrictedPathsSchema = {
  type: 'array',
  items: {
    type: 'object',
    properties: {
      name: { type: 'string' },
      message: { type: 'string', minLength: 1 },
      importNames: { type: 'array', items: { type: 'string' } },
    },
    additionalProperties: false,
    required: ['name', 'message'],
  },
  uniqueItems: true,
};

/**
 * Restricted path entries are passed either directly as the rule options or as `[{ paths }]`,
 * the two forms of `no-restricted-imports`. Later entries for the same name win.
 *
 * @param {ReadonlyArray<RestrictedPath> | readonly [{ paths: RestrictedPath[] }]} options
 * @returns {Map<string, RestrictedPath>}
 */
const getRestrictedPaths = (options) => {
  const paths = options[0] && Object.hasOwn(options[0], 'paths') ? options[0].paths : options;
  return new Map(paths.map((path) => [path.name, path]));
};

/** @param {Identifier | StringLiteral} node */
const getModuleExportName = (node) => (node.type === 'Identifier' ? node.name : node.value);

/**
 * Reports imports of restricted paths with the semantics and messages of typescript-eslint's
 * `no-restricted-imports` for `paths` entries (`name`, `message`, optional `importNames`),
 * so local `no-restricted-imports` overrides cannot drop these restrictions. Type-only imports
 * and exports are restricted like value imports.
 *
 * @type {Rule}
 */
module.exports = {
  meta: {
    type: 'suggestion',
    messages: {
      pathWithCustomMessage:
        "'{{importSource}}' import is restricted from being used. {{customMessage}}",
      everythingWithCustomMessage:
        "* import is invalid because '{{importNames}}' from '{{importSource}}' is restricted. {{customMessage}}",
      importNameWithCustomMessage:
        "'{{importName}}' import from '{{importSource}}' is restricted. {{customMessage}}",
    },
    schema: {
      anyOf: [
        restrictedPathsSchema,
        {
          type: 'array',
          items: [
            {
              type: 'object',
              properties: { paths: restrictedPathsSchema },
              additionalProperties: false,
              required: ['paths'],
            },
          ],
          additionalItems: false,
        },
      ],
    },
  },
  createOnce(context) {
    /** @type {Map<string, RestrictedPath>} */
    let restrictedPaths;

    /**
     * Imported names mapped to the locations importing them: `default`, `*` for namespace
     * imports and `export *`, otherwise the name exported by the source module.
     *
     * @param {ImportDeclaration | ExportNamedDeclaration | ExportAllDeclaration} node
     * @returns {Map<string, SourceLocation[]>}
     */
    const getImportedNames = (node) => {
      /** @type {Map<string, SourceLocation[]>} */
      const importedNames = new Map();
      /** @param {string} name @param {SourceLocation} loc */
      const add = (name, loc) => {
        const locs = importedNames.get(name);
        if (locs) {
          locs.push(loc);
        } else {
          importedNames.set(name, [loc]);
        }
      };

      if (node.type === 'ExportAllDeclaration') {
        add('*', context.sourceCode.getFirstToken(node, 1).loc);
        return importedNames;
      }

      for (const specifier of node.specifiers) {
        if (specifier.type === 'ImportDefaultSpecifier') {
          add('default', specifier.loc);
        } else if (specifier.type === 'ImportNamespaceSpecifier') {
          add('*', specifier.loc);
        } else if (specifier.type === 'ImportSpecifier') {
          add(getModuleExportName(specifier.imported), specifier.loc);
        } else {
          add(getModuleExportName(specifier.local), specifier.loc);
        }
      }
      return importedNames;
    };

    /**
     * @param {ImportDeclaration | ExportNamedDeclaration | ExportAllDeclaration | TSImportEqualsDeclaration} node
     * @param {string} importSource
     * @param {() => Map<string, SourceLocation[]>} getNames
     */
    const check = (node, importSource, getNames) => {
      const restrictedPath = restrictedPaths.get(importSource);
      if (!restrictedPath) {
        return;
      }

      const { message: customMessage, importNames: restrictedImportNames } = restrictedPath;
      if (!restrictedImportNames) {
        context.report({
          node,
          messageId: 'pathWithCustomMessage',
          data: { importSource, customMessage },
        });
        return;
      }

      const importedNames = getNames();
      const namespaceLocs = importedNames.get('*');
      if (namespaceLocs) {
        context.report({
          node,
          loc: namespaceLocs[0],
          messageId: 'everythingWithCustomMessage',
          data: { importSource, importNames: restrictedImportNames.join(','), customMessage },
        });
      }

      for (const importName of restrictedImportNames) {
        for (const loc of importedNames.get(importName) ?? []) {
          context.report({
            node,
            loc,
            messageId: 'importNameWithCustomMessage',
            data: { importSource, importName, customMessage },
          });
        }
      }
    };

    /** @param {ImportDeclaration | ExportNamedDeclaration | ExportAllDeclaration} node */
    const checkDeclaration = (node) => {
      if (node.source) {
        check(node, node.source.value.trim(), () => getImportedNames(node));
      }
    };

    return {
      before() {
        restrictedPaths = getRestrictedPaths(context.options);
        return restrictedPaths.size > 0;
      },
      ImportDeclaration: checkDeclaration,
      ExportNamedDeclaration: checkDeclaration,
      ExportAllDeclaration: checkDeclaration,
      // `import x = require('module')` is checked as a default import of the module.
      TSImportEqualsDeclaration(_) {
        const node = /** @type {TSImportEqualsDeclaration} */ (_);
        if (node.moduleReference.type === 'TSExternalModuleReference') {
          check(
            node,
            /** @type {StringLiteral} */ (node.moduleReference.expression).value.trim(),
            () => new Map([['default', [node.id.loc]]])
          );
        }
      },
    };
  },
};
