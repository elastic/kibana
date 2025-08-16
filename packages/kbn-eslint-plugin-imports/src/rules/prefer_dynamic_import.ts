/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { TSESLint, TSESTree, AST_NODE_TYPES } from '@typescript-eslint/utils';
import { Rule } from 'eslint';
import { getImportResolver } from '../get_import_resolver';
import { getRepoSourceClassifier } from '../helpers/repo_source_classifier';
import { getSourcePath } from '../helpers/source';

type PreferDynamicImportRuleOptions = [{ autofix?: boolean }?];

export const PreferDynamicImportRule: TSESLint.RuleModule<
  'preferDynamicImport' | 'rewriteToDynamicImport',
  PreferDynamicImportRuleOptions
> = {
  defaultOptions: [{ autofix: false }],
  meta: {
    type: 'suggestion',
    docs: { description: 'Flag static imports only used in async functions' },
    hasSuggestions: true,
    schema: [
      { type: 'object', properties: { autofix: { type: 'boolean' } }, additionalProperties: false },
    ],
    fixable: 'code',
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

    type WithParent = TSESTree.Node & { parent?: TSESTree.Node | null };
    const parentOf = (n: TSESTree.Node | null | undefined) => (n as WithParent)?.parent ?? null;

    const isTypePosition = (n: TSESTree.Node): boolean => {
      for (let p = parentOf(n); p; p = parentOf(p)) {
        if (
          p.type === AST_NODE_TYPES.TSTypeReference ||
          p.type === AST_NODE_TYPES.TSTypeAnnotation ||
          p.type === AST_NODE_TYPES.TSInterfaceDeclaration ||
          p.type === AST_NODE_TYPES.TSTypeAliasDeclaration
        ) {
          return true;
        }
        if (
          p.type === AST_NODE_TYPES.ExpressionStatement ||
          p.type === AST_NODE_TYPES.VariableDeclaration ||
          p.type === AST_NODE_TYPES.PropertyDefinition ||
          p.type === AST_NODE_TYPES.Program
        ) {
          return false;
        }
      }
      return false;
    };

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

    const isRefDirectlyReexported = (id: TSESTree.Identifier): boolean => {
      for (let p = parentOf(id); p; p = parentOf(p)) {
        if (p.type === AST_NODE_TYPES.ExportSpecifier) {
          const es = p as TSESTree.ExportSpecifier;
          if (es.local.type === AST_NODE_TYPES.Identifier && es.local.name === id.name) return true;
          return false;
        }
        if (p.type === AST_NODE_TYPES.ExportDefaultDeclaration) {
          const ed = p as TSESTree.ExportDefaultDeclaration;
          return (
            ed.declaration.type === AST_NODE_TYPES.Identifier && ed.declaration.name === id.name
          );
        }
        if (p.type === AST_NODE_TYPES.ExportNamedDeclaration) {
          const en = p as TSESTree.ExportNamedDeclaration;
          if (!en.specifiers || en.specifiers.length === 0) return false;
          return false;
        }
        if (p.type === AST_NODE_TYPES.Program) break;
      }
      return false;
    };
    const isBindingReexported = (refs: TSESLint.Scope.Reference[]) =>
      refs.some(
        (r) => r.identifier && isRefDirectlyReexported(r.identifier as TSESTree.Identifier)
      );

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
      const awaitedModuleExpr = `(await import(${JSON.stringify(source)}))`;

      for (const r of refs) {
        const id = r.identifier;
        if (!id) continue;

        // Handle type-only usage
        if (isTypePosition(id)) {
          let importedName = '';
          if (spec.type === AST_NODE_TYPES.ImportDefaultSpecifier) {
            importedName = 'default';
          } else if (spec.type === AST_NODE_TYPES.ImportSpecifier) {
            importedName =
              spec.imported.type === AST_NODE_TYPES.Identifier
                ? spec.imported.name
                : spec.imported.value;
          }
          const typeReplacement = importedName
            ? `import(${JSON.stringify(source)})${'.' + importedName}`
            : `import(${JSON.stringify(source)})`;
          fixes.push(fixer.replaceText(id, typeReplacement));
          continue;
        }

        // Handle object shorthand
        const parent = parentOf(id);
        if (
          parent &&
          parent.type === AST_NODE_TYPES.Property &&
          (parent as TSESTree.Property).shorthand
        ) {
          const keyName = id.name;
          fixes.push(fixer.replaceText(parent, `${keyName}: ${awaitedModuleExpr}.${keyName}`));
          continue;
        }

        // Runtime usage
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
                : spec.imported.value;
            replacement = `${awaitedModuleExpr}.${importedName}`;
            break;
          }
          default:
            replacement = awaitedModuleExpr;
        }
        fixes.push(fixer.replaceText(id, `(${replacement})`));
      }

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
        if (typeof source !== 'string' || node.importKind === 'type') return;

        const specToRefs: Array<{
          spec:
            | TSESTree.ImportSpecifier
            | TSESTree.ImportDefaultSpecifier
            | TSESTree.ImportNamespaceSpecifier;
          refs: TSESLint.Scope.Reference[];
        }> = [];
        for (const spec of node.specifiers) {
          if (
            spec.type !== AST_NODE_TYPES.ImportSpecifier &&
            spec.type !== AST_NODE_TYPES.ImportDefaultSpecifier &&
            spec.type !== AST_NODE_TYPES.ImportNamespaceSpecifier
          )
            continue;
          const variable = context.sourceCode.getDeclaredVariables(spec)[0];
          if (!variable) continue;
          const refs = variable.references.filter((r) => r.isRead());
          if (refs.length === 0 || isBindingReexported(refs)) continue;
          const allAsync = refs.every(
            (r) =>
              r.identifier && isInAsyncFunction(r.identifier) && !inDisallowedContext(r.identifier)
          );
          if (!allAsync) continue;
          specToRefs.push({ spec, refs });
        }

        if (specToRefs.length === 0) return;

        const reportFixFn = (fixer: TSESLint.RuleFixer) => {
          let fixes: TSESLint.RuleFix[] = [];
          for (const { spec, refs } of specToRefs) {
            fixes = fixes.concat(buildInlineImportFixes(spec, refs, node, fixer));
          }
          return fixes;
        };

        const reportBase = {
          node,
          messageId: 'preferDynamicImport' as const,
          data: { source },
          suggest: [
            {
              data: { source },
              messageId: 'rewriteToDynamicImport' as const,
              fix: reportFixFn,
            },
          ],
        };

        if (autofix) {
          context.report({
            ...reportBase,
            fix: reportFixFn,
          });
        } else {
          context.report(reportBase);
        }
      },
    };
  },
};
