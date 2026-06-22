/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { TSESTree } from '@typescript-eslint/typescript-estree';
import type { Rule } from 'eslint';
import { AST_NODE_TYPES } from '@typescript-eslint/typescript-estree';

/**
 * Proper nouns kept in exact casing that currently appear in nav. Unused brand
 * names are omitted; add one only when it lands in nav.
 * Everything else is sentence case; acronyms are auto-detected.
 */
const CANONICAL_NAV_TERMS = [
  // Brand/feature names used in nav.
  'Significant Events',
  'Universal Profiling',
  // Kibana UI names the brand guide capitalises.
  'Machine Learning',
  'Stack Monitoring',
  'User Experience',
  'Elastic AI SOC Engine',
  'Elastic Inference',
] as const;

const CANONICAL_NAV_TERMS_MAP = new Map(CANONICAL_NAV_TERMS.map((t) => [t.toLowerCase(), t]));

/** Navigation-module files: check label/title only, for cases without the core-chrome import. */
const NAV_PATH_SEGMENT = /[\\/]navigation[\\/]/;

/**
 * Excluded from sentence case: acronyms (API), mixed-case brand tokens (GenAI, macOS),
 * and tokens with symbols (ATT&CK®, Cross-Cluster, ES|QL).
 */
function isTitleCasedWord(word: string): boolean {
  return /^[A-Z][a-z]+$/.test(word);
}

/** A plain lowercase word ("workflows") — the first word must be capitalised.
 *  Mixed-case/symbol tokens (macOS, n-gram, ES|QL) are left alone. */
function isLowercaseWord(word: string): boolean {
  return /^[a-z]+$/.test(word);
}

function toSentenceCaseSuggestion(str: string): string {
  return str
    .trim()
    .split(/\s+/)
    .map((word, i) => {
      if (i === 0) return isLowercaseWord(word) ? word[0].toUpperCase() + word.slice(1) : word;
      return isTitleCasedWord(word) ? word[0].toLowerCase() + word.slice(1) : word;
    })
    .join(' ');
}

/**
 * True for a label/title in a `*.registerApp(...)` object or a `deepLinks: [...]`
 * element. Bare `application.register(...)` is excluded (an app isn't nav).
 */
function isInNavRegistrationContext(prop: TSESTree.Property): boolean {
  const objExpr = prop.parent;
  if (!objExpr || objExpr.type !== AST_NODE_TYPES.ObjectExpression) return false;

  const objParent = objExpr.parent;
  if (!objParent) return false;

  // registerApp(...) — management section apps
  if (
    objParent.type === AST_NODE_TYPES.CallExpression &&
    objParent.arguments.includes(objExpr as TSESTree.CallExpressionArgument) &&
    objParent.callee.type === AST_NODE_TYPES.MemberExpression &&
    objParent.callee.property.type === AST_NODE_TYPES.Identifier &&
    objParent.callee.property.name === 'registerApp'
  ) {
    return true;
  }

  // element of a `deepLinks: [...]` array
  if (objParent.type === AST_NODE_TYPES.ArrayExpression) {
    const arrParent = objParent.parent;
    if (
      arrParent &&
      arrParent.type === AST_NODE_TYPES.Property &&
      arrParent.key.type === AST_NODE_TYPES.Identifier &&
      arrParent.key.name === 'deepLinks'
    ) {
      return true;
    }
  }

  return false;
}

/** True when the object has a literal `visibleIn: []` (hidden everywhere). A
 *  referenced const or spread is not resolved — only the empty-array literal. */
function isHiddenFromNav(prop: TSESTree.Property): boolean {
  const obj = prop.parent;
  if (!obj || obj.type !== AST_NODE_TYPES.ObjectExpression) return false;
  return obj.properties.some(
    (p) =>
      p.type === AST_NODE_TYPES.Property &&
      p.key.type === AST_NODE_TYPES.Identifier &&
      p.key.name === 'visibleIn' &&
      p.value.type === AST_NODE_TYPES.ArrayExpression &&
      p.value.elements.length === 0
  );
}

/** String value of a string literal, or null. */
function getStaticString(node: TSESTree.Node): string | null {
  return node.type === AST_NODE_TYPES.Literal && typeof node.value === 'string' ? node.value : null;
}

function getTranslateDefaultMessage(node: TSESTree.Node): string | null {
  if (node.type !== AST_NODE_TYPES.CallExpression) return null;

  const { callee } = node;
  if (
    callee.type !== AST_NODE_TYPES.MemberExpression ||
    callee.object.type !== AST_NODE_TYPES.Identifier ||
    callee.property.type !== AST_NODE_TYPES.Identifier ||
    callee.object.name !== 'i18n' ||
    callee.property.name !== 'translate'
  ) {
    return null;
  }

  const optionsArg = node.arguments[1];
  if (!optionsArg || optionsArg.type !== AST_NODE_TYPES.ObjectExpression) return null;

  const defaultMessageProp = optionsArg.properties.find(
    (p): p is TSESTree.Property =>
      p.type === AST_NODE_TYPES.Property &&
      p.key.type === AST_NODE_TYPES.Identifier &&
      p.key.name === 'defaultMessage'
  );

  return defaultMessageProp ? getStaticString(defaultMessageProp.value) : null;
}

export const MESSAGES = {
  brandMismatch:
    '"{{message}}" is a known canonical nav term — use the exact casing "{{expected}}".',
  capitalizeFirst:
    'Navigation title "{{message}}" should start with a capital letter (e.g. "{{suggestion}}").',
  sentenceCase:
    'Navigation title "{{message}}" should use sentence case (e.g. "{{suggestion}}").' +
    ' Only the first word, acronyms, and approved proper nouns are capitalised.' +
    ' If "{{word}}" is a product or feature name that must keep specific casing,' +
    ' confirm the official format in the Elastic brand writing style guide' +
    ' (https://brand.elastic.co/302f66895/p/194a3b-writing-style-guide) or with the brand team,' +
    ' then add the exact name to CANONICAL_NAV_TERMS in' +
    ' nav_link_should_use_sentence_case.ts.',
} as const;

export const NavLinkShouldUseSentenceCase: Rule.RuleModule = {
  meta: {
    type: 'suggestion',
    // Intentionally not fixable (no `meta.fixable`, no `fix`): `eslint --fix`
    // must never auto-rewrite a shipped nav label.
    docs: {
      description:
        'Navigation link titles must use sentence case. Terms in CANONICAL_NAV_TERMS' +
        ' must match their exact canonical casing.',
      url: 'https://github.com/elastic/kibana/blob/main/packages/kbn-eslint-plugin-i18n/rules/nav_link_should_use_sentence_case.ts',
    },
    messages: MESSAGES,
    schema: [],
  },

  create(context) {
    // Where titles are checked:
    //  - importNavFile: imports @kbn/core-chrome-browser — label/title + title consts.
    //  - pathNavFile: inside a navigation module — label/title only.
    //  - registration: *.registerApp / deepLinks titles in any file (not bare register).
    const pathNavFile = NAV_PATH_SEGMENT.test(context.filename);
    let importNavFile = false;

    function checkString(message: string, reportNode: Rule.Node) {
      // Canonical term: enforce exact casing
      const canonicalTerm = CANONICAL_NAV_TERMS_MAP.get(message.toLowerCase().trim());
      if (canonicalTerm !== undefined) {
        if (message !== canonicalTerm) {
          context.report({
            node: reportNode,
            messageId: 'brandMismatch',
            data: { message, expected: canonicalTerm },
          });
        }
        return;
      }

      const words = message.trim().split(/\s+/);

      // First word must be capitalised
      if (isLowercaseWord(words[0])) {
        context.report({
          node: reportNode,
          messageId: 'capitalizeFirst',
          data: { message, suggestion: toSentenceCaseSuggestion(message) },
        });
        return;
      }

      // Later words must be lowercase (unless acronym/brand/proper noun)
      for (let i = 1; i < words.length; i++) {
        if (isTitleCasedWord(words[i])) {
          context.report({
            node: reportNode,
            messageId: 'sentenceCase',
            data: { message, suggestion: toSentenceCaseSuggestion(message), word: words[i] },
          });
          return;
        }
      }
    }

    // Property catches titles written inline (title:/label:); CallExpression catches titles defined as standalone i18n.translate consts.
    return {
      ImportDeclaration(node) {
        const importNode = node as TSESTree.ImportDeclaration;
        if (importNode.source.value === '@kbn/core-chrome-browser') {
          importNavFile = true;
        }
      },

      // Title consts in nav-tree files: `const FOO_TITLE = i18n.translate(...)`.
      // Restricted to const initializers so non-title values (description,
      // tooltip, aria label) and inline title/label (owned by Property) are
      // not also reported here.
      CallExpression(node) {
        if (!importNavFile) return;

        const callNode = node as TSESTree.CallExpression;
        if (callNode.parent?.type !== AST_NODE_TYPES.VariableDeclarator) return;

        const defaultMessage = getTranslateDefaultMessage(callNode);
        if (defaultMessage === null) return;

        checkString(defaultMessage, callNode as unknown as Rule.Node);
      },

      // Checks `label`/`title` values (a string literal or an i18n.translate)
      // in nav-tree files, navigation modules, and registerApp/deepLinks objects.
      Property(node) {
        const prop = node as TSESTree.Property;

        if (
          prop.key.type !== AST_NODE_TYPES.Identifier ||
          (prop.key.name !== 'label' && prop.key.name !== 'title')
        ) {
          return;
        }

        const inRegistrationContext = isInNavRegistrationContext(prop);
        if (!importNavFile && !pathNavFile && !inRegistrationContext) return;

        if (isHiddenFromNav(prop)) return; // not rendered in nav (visibleIn: [])

        const valueNode = prop.value;

        const literal = getStaticString(valueNode);
        if (literal !== null) {
          checkString(literal, valueNode as unknown as Rule.Node);
          return;
        }

        const defaultMessage = getTranslateDefaultMessage(valueNode);
        if (defaultMessage !== null) {
          checkString(defaultMessage, valueNode as unknown as Rule.Node);
        }
      },
    };
  },
};
