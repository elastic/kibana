/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { CreateOnceRule, Definition, ESTree, Scope, SourceCode } from '@oxlint/plugins';
import { isMonacoPackageFile } from '../helpers/is_monaco_package_file';

type MaybeNode = ESTree.Node | null | undefined;
type IdentifierNode = Extract<ESTree.Node, { type: 'Identifier' }>;

/**
 * The module specifiers that hand out Monaco: the two packages whose files are exempt, as consumers
 * import them, and the raw `monaco-editor` package they are built on.
 */
const MONACO_SPECIFIERS = ['@kbn/monaco', '@kbn/code-editor', 'monaco-editor'];

const isMonacoSpecifier = (source: unknown): boolean =>
  typeof source === 'string' &&
  MONACO_SPECIFIERS.some((specifier) => source === specifier || source.startsWith(`${specifier}/`));

/** Aliases are followed this far (`const a = b; const b = a` must not loop forever). */
const MAX_ALIAS_DEPTH = 8;

/** `foo.bar` and `foo['bar']` both have the property name `bar`. Anything dynamic has none. */
const getPropertyName = (node: MaybeNode): string | undefined => {
  if (node?.type !== 'MemberExpression') {
    return undefined;
  }

  if (!node.computed) {
    return node.property.type === 'Identifier' ? node.property.name : undefined;
  }

  return node.property.type === 'Literal' && typeof node.property.value === 'string'
    ? node.property.value
    : undefined;
};

/** `monaco.editor!.setTheme()` has a `TSNonNullExpression` between the two member accesses. */
const unwrapNonNull = (node: MaybeNode): MaybeNode =>
  node?.type === 'TSNonNullExpression' ? unwrapNonNull(node.expression) : node;

/**
 * The property a name was destructured from, so `const { editor: e } = monaco` gives `editor` for
 * `e`. Only the first level of the pattern is read: nested patterns and rest elements have none.
 */
const getDestructuredKey = (pattern: MaybeNode, bindingName: string): string | undefined => {
  if (pattern?.type !== 'ObjectPattern') {
    return undefined;
  }

  for (const property of pattern.properties) {
    if (property.type !== 'Property') {
      continue;
    }

    const binding =
      property.value.type === 'AssignmentPattern' ? property.value.left : property.value;
    if (binding.type !== 'Identifier' || binding.name !== bindingName) {
      continue;
    }

    if (!property.computed && property.key.type === 'Identifier') {
      return property.key.name;
    }

    if (property.key.type === 'Literal' && typeof property.key.value === 'string') {
      return property.key.value;
    }
  }

  return undefined;
};

/** `import { editor as e }` has the imported name `editor`. */
const getImportedName = (specifier: MaybeNode): string | undefined => {
  if (specifier?.type !== 'ImportSpecifier') {
    return undefined;
  }

  return specifier.imported.type === 'Identifier'
    ? specifier.imported.name
    : specifier.imported.value;
};

/** The module an import binding comes from: `monaco-editor` for `import { editor } from 'monaco-editor'`. */
const getImportSource = ({ parent }: Definition): string | undefined =>
  parent?.type === 'ImportDeclaration' ? parent.source.value : undefined;

/**
 * Disallows `<anything>.editor.defineTheme(...)` and `<anything>.editor.setTheme(...)` outside of
 * `@kbn/monaco` and `@kbn/code-editor`.
 *
 * Monaco has one active theme per page, so both calls change how every editor on the page looks,
 * not just the caller's. Kibana defines exactly one theme and scopes syntax colors per language
 * inside it (`@kbn/monaco`) and chrome per editor instance (`@kbn/code-editor`).
 *
 * The match is on the member chain rather than the method name alone: `setTheme` is also the name
 * of unrelated services (`setTheme(core.theme)`), and only calls reached through `.editor` are
 * Monaco's. A bare identifier is another matter, since `editor` is a common name (an Ace or
 * CodeMirror instance has one too), so it is only flagged when it can be traced to Monaco:
 *
 * - `import { editor } from 'monaco-editor/...'`
 * - `const { editor } = monaco`, or `const { editor: e } = monaco`
 * - `const editor = monaco.editor`
 *
 * where `monaco` is itself an import from one of the Monaco specifiers, or an alias of one.
 * Anything that cannot be traced (a function parameter, a call result, an import from elsewhere) is
 * left alone: a missed call is better than an error on someone else's `editor`.
 */
export const NoDirectMonacoThemeCallsRule: CreateOnceRule = {
  meta: {
    type: 'problem',
    docs: {
      description:
        'Disallow monaco.editor.defineTheme and monaco.editor.setTheme outside of @kbn/monaco and @kbn/code-editor.',
      url: 'https://github.com/elastic/kibana/blob/main/packages/kbn-eslint-plugin-kbn-monaco/README.mdx#kbnkbn-monacono_direct_monaco_theme_calls',
      recommended: true,
    },
    messages: {
      noDefineTheme:
        'Do not call monaco.editor.defineTheme outside of @kbn/monaco and @kbn/code-editor. ' +
        'Monaco has one active theme per page, so a theme defined here changes every editor on the page. ' +
        "Contribute syntax colors with a language theme resolver, and per-editor chrome with CodeEditor's " +
        '"chromeOverrides" (or applyKbnCodeEditorChromeOverrides for editors created with monaco.editor.create*).',
      noSetTheme:
        'Do not call monaco.editor.setTheme outside of @kbn/monaco and @kbn/code-editor. ' +
        'Monaco has one active theme per page, so this changes every editor on the page. ' +
        'Register the shared theme with initializeRegisteredLanguagesTheme before creating the editor, ' +
        'and pass CODE_EDITOR_DEFAULT_THEME_ID as its "theme" option.',
    },
  },

  createOnce(context) {
    // Per-file state belongs in `before()`: `createOnce` runs once, before there is a file.
    let sourceCode: SourceCode;

    /** What an identifier refers to, as far as scope analysis can tell. */
    const findDefinition = (identifier: IdentifierNode): Definition | undefined => {
      for (let scope: Scope | null = sourceCode.getScope(identifier); scope; scope = scope.upper) {
        const variable = scope.set.get(identifier.name);
        if (variable) {
          return variable.defs[0];
        }
      }

      return undefined;
    };

    /** Whether the node is the `monaco` namespace, i.e. the thing that has an `.editor`. */
    const isMonacoNamespace = (candidate: MaybeNode, depth = 0): boolean => {
      const node = unwrapNonNull(candidate);

      if (!node || depth > MAX_ALIAS_DEPTH) {
        return false;
      }

      // `window.MonacoEnvironment.monaco`
      if (node.type === 'MemberExpression') {
        return getPropertyName(node) === 'monaco';
      }

      if (node.type !== 'Identifier') {
        return false;
      }

      const definition = findDefinition(node);

      if (definition?.type === 'ImportBinding') {
        return isMonacoSpecifier(getImportSource(definition));
      }

      if (definition?.type === 'Variable' && definition.node.type === 'VariableDeclarator') {
        const { id, init } = definition.node;

        // `const m = monaco`
        if (id.type === 'Identifier') {
          return isMonacoNamespace(init, depth + 1);
        }

        // `const { monaco } = window.MonacoEnvironment`
        return getDestructuredKey(id, node.name) === 'monaco';
      }

      return false;
    };

    /** Whether the node is Monaco's `editor` namespace, reached through an alias or an import. */
    const isEditorAlias = (candidate: MaybeNode, depth = 0): boolean => {
      const node = unwrapNonNull(candidate);

      if (!node || depth > MAX_ALIAS_DEPTH) {
        return false;
      }

      // `const editor = monaco.editor`: the root must trace to Monaco, unlike a direct call, because
      // here the member access is hidden behind a name the reader has to trust.
      if (node.type === 'MemberExpression') {
        return getPropertyName(node) === 'editor' && isMonacoNamespace(node.object, depth + 1);
      }

      if (node.type !== 'Identifier') {
        return false;
      }

      const definition = findDefinition(node);

      // `import { editor } from 'monaco-editor/editor/editor.api.js'`
      if (definition?.type === 'ImportBinding') {
        return (
          getImportedName(definition.node) === 'editor' &&
          isMonacoSpecifier(getImportSource(definition))
        );
      }

      if (definition?.type === 'Variable' && definition.node.type === 'VariableDeclarator') {
        const { id, init } = definition.node;

        // `const e = monaco.editor`, `const e = editor`
        if (id.type === 'Identifier') {
          return isEditorAlias(init, depth + 1);
        }

        // `const { editor } = monaco`, `const { editor: e } = monaco`
        return getDestructuredKey(id, node.name) === 'editor' && isMonacoNamespace(init);
      }

      return false;
    };

    return {
      before() {
        // Skipped for the packages that own the boundary; returning `false` skips the whole file.
        if (isMonacoPackageFile(context.filename)) {
          return false;
        }

        sourceCode = context.sourceCode;
        return true;
      },

      CallExpression(node) {
        const { callee } = node;
        if (callee.type !== 'MemberExpression') {
          return;
        }

        const method = getPropertyName(callee);
        if (method !== 'defineTheme' && method !== 'setTheme') {
          return;
        }

        // calls reached through `.editor`, i.e. `<anything>.editor.<method>(...)`, or through an
        // alias of Monaco's `editor` that can be traced back to an import
        const object = unwrapNonNull(callee.object);
        if (getPropertyName(object) !== 'editor' && !isEditorAlias(object)) {
          return;
        }

        context.report({
          node: callee,
          messageId: method === 'defineTheme' ? 'noDefineTheme' : 'noSetTheme',
        });
      },
    };
  },
};
