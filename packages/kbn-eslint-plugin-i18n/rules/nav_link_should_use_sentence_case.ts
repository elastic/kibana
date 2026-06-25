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
  'AI Assistant',
  'AI Assistants',
  'Cloud Connect',
  'Elastic AI SOC Engine',
  'Elastic Inference',
  'Machine Learning',
  'Significant Events',
  'Stack Monitoring',
  'Universal Profiling',
] as const;

const CANONICAL_NAV_TERMS_MAP = new Map(CANONICAL_NAV_TERMS.map((t) => [t.toLowerCase(), t]));

/** Navigation-module files: check label/title only, for cases without the core-chrome import. */
const NAV_PATH_SEGMENT = /[\\/]navigation[\\/]/;

// security_solution nav titles live outside /navigation/: top-level consts in app/translations.ts
// (consumed cross-file, unreachable at the usage site) and inline i18n.translate() calls in
// public/*/links.ts. Hard-coded because this two-layer architecture is unique to this plugin.
const SECURITY_NAV_TRANSLATIONS = /[\\/]security_solution[\\/]public[\\/]app[\\/]translations\.ts$/;
const SECURITY_LINKS_FILE = /[\\/]security_solution[\\/]public[\\/][^/\\]+[\\/]links\.ts$/;

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

const SIDENAV_CONTEXTS = new Set(['classicSideNav', 'projectSideNav']);

/**
 * True when the object's `visibleIn` array contains no sidenav context.
 * Skipped (returns false) if `visibleIn` is absent, non-literal, or a referenced const —
 * we only suppress checking when we can prove the item is not shown in the sidenav.
 */
function isHiddenFromSideNav(prop: TSESTree.Property): boolean {
  const obj = prop.parent;
  if (!obj || obj.type !== AST_NODE_TYPES.ObjectExpression) return false;

  const visibleInProp = obj.properties.find(
    (p): p is TSESTree.Property =>
      p.type === AST_NODE_TYPES.Property &&
      p.key.type === AST_NODE_TYPES.Identifier &&
      p.key.name === 'visibleIn'
  );

  if (!visibleInProp) return false;
  if (visibleInProp.value.type !== AST_NODE_TYPES.ArrayExpression) return false; // const ref — don't assume hidden

  const elements = visibleInProp.value.elements;
  // Empty array → hidden everywhere
  if (elements.length === 0) return true;
  // Non-empty → hidden from sidenav only if no sidenav context is listed
  return !elements.some(
    (el) =>
      el !== null &&
      el.type === AST_NODE_TYPES.Literal &&
      typeof el.value === 'string' &&
      SIDENAV_CONTEXTS.has(el.value)
  );
}

/** String value of a string literal or no-expression template literal, or null. */
function getStaticString(node: TSESTree.Node): string | null {
  if (node.type === AST_NODE_TYPES.Literal && typeof node.value === 'string') return node.value;
  if (node.type === AST_NODE_TYPES.TemplateLiteral && node.expressions.length === 0)
    return node.quasis[0].value.cooked ?? null;
  return null;
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
    // Scope triggers — each enables a different subset of checks (see visitors below):
    //  - importNavFile: imports @kbn/core-chrome-browser
    //  - pathNavFile: path contains /navigation/
    //  - securityNavTranslations / securityLinksFile: security-specific hard-coded paths
    const pathNavFile = NAV_PATH_SEGMENT.test(context.filename);
    const securityNavTranslations = SECURITY_NAV_TRANSLATIONS.test(context.filename);
    const securityLinksFile = SECURITY_LINKS_FILE.test(context.filename);
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

    // Resolves same-file `title: CONST` to its initializer. Cross-file refs are covered
    // by the security-specific paths above.
    function resolveSameFileConstInit(idNode: TSESTree.Identifier): TSESTree.Node | null {
      const scope = context.sourceCode.getScope(idNode as unknown as Rule.Node);
      const variable = scope.references.find((r) => r.identifier === idNode)?.resolved;
      if (!variable) return null;
      const def = variable.defs[0];
      if (def?.type === 'Variable' && def.node.init)
        return def.node.init as unknown as TSESTree.Node;
      return null;
    }

    return {
      ImportDeclaration(node) {
        const importNode = node as TSESTree.ImportDeclaration;
        if (importNode.source.value === '@kbn/core-chrome-browser') {
          importNavFile = true;
        }
      },

      // Every export in app/translations.ts is a nav title — check all i18n.translate() calls.
      CallExpression(node) {
        if (!securityNavTranslations) return;
        const callNode = node as TSESTree.CallExpression;
        const msg = getTranslateDefaultMessage(callNode);
        if (msg !== null) checkString(msg, callNode as unknown as Rule.Node);
      },

      // Checks `label`/`title`: string literal, inline i18n.translate, or same-file const ref.
      Property(node) {
        const prop = node as TSESTree.Property;

        if (
          prop.key.type !== AST_NODE_TYPES.Identifier ||
          (prop.key.name !== 'label' && prop.key.name !== 'title')
        ) {
          return;
        }

        const inRegistrationContext = isInNavRegistrationContext(prop);
        if (!importNavFile && !pathNavFile && !inRegistrationContext && !securityLinksFile) return;

        if (isHiddenFromSideNav(prop)) return;

        const valueNode = prop.value;

        // Direct string literal or inline i18n.translate.
        const direct = getStaticString(valueNode) ?? getTranslateDefaultMessage(valueNode);
        if (direct !== null) {
          checkString(direct, valueNode as unknown as Rule.Node);
          return;
        }

        // `title: SOME_CONST` → resolve to its same-file const initializer.
        if (valueNode.type === AST_NODE_TYPES.Identifier) {
          const init = resolveSameFileConstInit(valueNode);
          const resolved = init && (getStaticString(init) ?? getTranslateDefaultMessage(init));
          if (resolved) checkString(resolved, init as unknown as Rule.Node);
        }
      },
    };
  },
};
