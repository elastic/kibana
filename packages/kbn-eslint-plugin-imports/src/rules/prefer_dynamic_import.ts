/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in, at your election,
 * the "Elastic License 2.0", the "GNU Affero General Public License v3.0 only",
 * or the "Server Side Public License, v 1".
 */

import { TSESLint, TSESTree, AST_NODE_TYPES } from '@typescript-eslint/utils';
import { Rule } from 'eslint';
import { getImportResolver } from '../get_import_resolver';
import { getRepoSourceClassifier } from '../helpers/repo_source_classifier';
import { getSourcePath } from '../helpers/source';

type PreferDynamicImportRuleOptions = [{ autofix?: boolean }?];

// rules/import-only-used-in-async.ts
export const PreferDynamicImportRule: TSESLint.RuleModule<
  'preferDynamicImport' | 'rewriteToDynamicImport',
  PreferDynamicImportRuleOptions
> = {
  defaultOptions: [
    {
      autofix: false,
    },
  ],
  meta: {
    type: 'suggestion',
    docs: { description: 'Flag static imports only used in async functions' },
    // No automatic fix; show a code-fix suggestion instead.
    hasSuggestions: true,
    schema: [
      {
        type: 'object',
        properties: {
          autofix: { type: 'boolean' },
        },
        additionalProperties: false,
      },
    ],
    messages: {
      preferDynamicImport:
        "Import '{{source}}' is only used in async functions; consider converting to dynamic import().",
      rewriteToDynamicImport: 'Convert {{source}} to dynamic import().',
    },
  },
  create(context) {
    const eslintRuleContext = context as unknown as Rule.RuleContext;

    const resolver = getImportResolver(eslintRuleContext);
    const classifier = getRepoSourceClassifier(resolver);
    const sourcePath = getSourcePath(eslintRuleContext);
    const self = classifier.classify(sourcePath);

    if (self.type !== 'server package') {
      return {};
    }

    const [{ autofix = false } = {}] = context.options ?? [];

    const sourceCode = context.sourceCode;

    // ESLint attaches `.parent` at runtime; add a local helper to satisfy TS.
    type WithParent = TSESTree.Node & { parent?: TSESTree.Node | null };
    const parentOf = (n: TSESTree.Node | null | undefined) =>
      (n as WithParent | null | undefined)?.parent ?? null;

    type FnLike =
      | TSESTree.FunctionDeclaration
      | TSESTree.FunctionExpression
      | TSESTree.ArrowFunctionExpression;

    const nearestFunction = (start: TSESTree.Node): FnLike | null => {
      for (let p = parentOf(start); p; p = parentOf(p)) {
        switch (p.type) {
          case AST_NODE_TYPES.FunctionDeclaration:
          case AST_NODE_TYPES.FunctionExpression:
          case AST_NODE_TYPES.ArrowFunctionExpression:
            return p;
          case AST_NODE_TYPES.Program:
            return null;
        }
      }
      return null;
    };

    const isInAsyncFunction = (n: TSESTree.Node) => !!nearestFunction(n)?.async;

    // Avoid replacing within class fields / decorators where `await` is illegal.
    const inDisallowedContext = (n: TSESTree.Node) => {
      for (let p = parentOf(n); p; p = parentOf(p)) {
        if (
          p.type === AST_NODE_TYPES.PropertyDefinition ||
          p.type === AST_NODE_TYPES.StaticBlock ||
          p.type === AST_NODE_TYPES.Decorator
        )
          return true;
        if (p.type === AST_NODE_TYPES.Program) break;
      }
      return false;
    };

    // Determine if a given reference is part of an export/re-export.
    const isRefInExport = (id: TSESTree.Identifier): boolean => {
      for (let p = parentOf(id); p; p = parentOf(p)) {
        if (
          p.type === AST_NODE_TYPES.ExportSpecifier ||
          p.type === AST_NODE_TYPES.ExportNamedDeclaration ||
          p.type === AST_NODE_TYPES.ExportDefaultDeclaration
        ) {
          return true;
        }
        if (p.type === AST_NODE_TYPES.Program) break;
      }
      return false;
    };

    const isBindingReexported = (refs: TSESLint.Scope.Reference[]) =>
      refs.some((r) => r.identifier && isRefInExport(r.identifier as TSESTree.Identifier));

    const buildInlineImportFixes = (
      spec:
        | TSESTree.ImportSpecifier
        | TSESTree.ImportDefaultSpecifier
        | TSESTree.ImportNamespaceSpecifier,
      refs: TSESLint.Scope.Reference[],
      node: TSESTree.ImportDeclaration,
      fixer: TSESLint.RuleFixer
    ): TSESLint.RuleFix[] => {
      const fixes: TSESLint.RuleFix[] = [];
      const source = node.source.value as string;

      for (const r of refs) {
        const id = r.identifier;
        if (!id) continue;

        const awaitedModuleExpr = `(await import(${JSON.stringify(source)}))`;
        let replacement: string;

        switch (spec.type) {
          case AST_NODE_TYPES.ImportNamespaceSpecifier:
            replacement = awaitedModuleExpr;
            break;
          case AST_NODE_TYPES.ImportDefaultSpecifier:
            replacement = `${awaitedModuleExpr}.default`;
            break;
          case AST_NODE_TYPES.ImportSpecifier: {
            const importedName =
              spec.imported.type === AST_NODE_TYPES.Identifier
                ? spec.imported.name
                : spec.imported.value; // string literal
            replacement = `${awaitedModuleExpr}.${importedName}`;
            break;
          }
          default:
            replacement = awaitedModuleExpr;
        }

        fixes.push(fixer.replaceText(id, `(${replacement})`));
      }

      // Remove the import specifier (or the whole declaration if last one).
      if (node.specifiers.length === 1) {
        fixes.push(fixer.remove(node));
      } else {
        const tokenAfter = sourceCode.getTokenAfter(spec);
        if (tokenAfter && tokenAfter.value === ',') {
          fixes.push(fixer.removeRange([spec.range[0], tokenAfter.range[1]]));
        } else {
          fixes.push(fixer.remove(spec));
        }
      }

      return fixes;
    };

    return {
      ImportDeclaration(node: TSESTree.ImportDeclaration) {
        const source = node.source.value;
        if (typeof source !== 'string') return;
        if (node.importKind === 'type') return;

        for (const spec of node.specifiers) {
          if (
            spec.type === AST_NODE_TYPES.ImportSpecifier ||
            spec.type === AST_NODE_TYPES.ImportDefaultSpecifier ||
            spec.type === AST_NODE_TYPES.ImportNamespaceSpecifier
          ) {
            const variable = context.sourceCode.getDeclaredVariables(spec)[0];
            if (!variable) continue;

            const refs = variable.references.filter((r) => r.isRead());
            if (refs.length === 0) continue;

            // Skip if this imported binding is exported/re-exported from this module.
            if (isBindingReexported(refs)) continue;

            const allAsync = refs.every(
              (r) =>
                r.identifier &&
                isInAsyncFunction(r.identifier as TSESTree.Node) &&
                !inDisallowedContext(r.identifier as TSESTree.Node)
            );
            if (!allAsync) continue;

            const suggestFix = (fixer: TSESLint.RuleFixer) =>
              buildInlineImportFixes(spec, refs, node, fixer);

            const reportBase = {
              node: spec,
              messageId: 'preferDynamicImport' as const,
              data: { source },
              suggest: [
                {
                  data: { source },
                  messageId: 'rewriteToDynamicImport' as const,
                  fix: suggestFix,
                },
              ],
            };

            if (autofix) {
              // Provide an autofix (used by --fix). Keep a suggestion as well for editor UX.
              context.report({
                ...reportBase,
                fix: suggestFix,
              });
            } else {
              // Only suggestions; no autofix.
              context.report(reportBase);
            }
          }
        }
      },
    };
  },
};
