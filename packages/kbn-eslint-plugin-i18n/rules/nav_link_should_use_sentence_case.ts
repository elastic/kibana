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
 * Genuine brand names, trademarks, and product names that must always appear
 * with specific capitalisation in navigation titles.
 *
 * Add new entries here only for real brand or trademark terms — not for generic
 * feature names that happen to look nicer in Title Case.
 *
 * Pure acronyms (API, TLS, AI, SIEM, KQL…) are detected automatically and do
 * not need to appear here.
 */
const BRAND_GLOSSARY = [
  'Machine Learning', // Elastic product / technical discipline
  'AI Assistant', // Elastic AI Assistant product — plural "AI Assistants" is matched automatically
  'Elastic Inference', // Elastic Inference Service brand
  'Cloud Connect', // Cloud Connect product
  'Logstash Pipelines', // Logstash is a branded product
  'Ingest Hub', // Ingest Hub product
  'SIEM Readiness', // SIEM acronym + companion word
  'MITRE ATT&CK® Coverage', // MITRE organisation + ATT&CK® framework trademark
  'Cross-Cluster Replication', // Elasticsearch compound technical term
  'Universal Profiling', // Elastic Universal Profiling product
] as const;

const BRAND_GLOSSARY_MAP = new Map(BRAND_GLOSSARY.map((t) => [t.toLowerCase(), t]));

/**
 * Looks up a brand entry by key, also checking the singular form when the key
 * ends with 's'. This lets a single glossary entry cover both singular and plural
 * (e.g. 'AI Assistant' covers 'AI Assistants' automatically).
 */
function findBrandEntry(key: string): string | undefined {
  const direct = BRAND_GLOSSARY_MAP.get(key);
  if (direct !== undefined) return direct;
  if (key.endsWith('s')) {
    const singular = BRAND_GLOSSARY_MAP.get(key.slice(0, -1));
    if (singular !== undefined) return singular + 's';
  }
  return undefined;
}

/**
 * Navigation terms that were in the original runtime glossary and whose Title Case
 * must be preserved for UI consistency. These are NOT brand names — they are
 * grandfathered in so that existing strings do not generate noise.
 *
 * Do NOT add new entries here. New navigation titles should either be genuine brand
 * names (→ BRAND_GLOSSARY) or use sentence case.
 */
const KNOWN_TERMS = [
  'Developer Tools',
  'Stack Management',
  'Index Management',
  'Index Lifecycle Policies',
  'Snapshot and Restore',
  'Rollup Jobs',
  'Data Set Quality',
  'Ingest Pipelines',
  'Stack Monitoring',
  'Maintenance Windows',
  'Trained Models',
  'Anomaly Detection Jobs',
  'Data Frame Analytics Jobs',
  'Role Mappings',
  'Remote Clusters',
  'Saved Objects',
  'Advanced Settings',
  'Data Views',
  'License Management',
  'Alerts and Insights',
  'Ingest and Integrations',
  'V2 Alerting Preview',
] as const;

const KNOWN_TERMS_MAP = new Map(KNOWN_TERMS.map((t) => [t.toLowerCase(), t]));

function isAllowedMidWord(word: string): boolean {
  if (/[^a-zA-Z]/.test(word)) return true; // contains special chars: ATT&CK®, Cross-Cluster, punctuation-only
  return /^[A-Z]+$/.test(word); // pure acronym: API, TLS, AI, SIEM, KQL
}

function findSentenceCaseViolation(str: string): string | null {
  const words = str.trim().split(/\s+/);
  if (words.length < 2) return null;
  for (let i = 1; i < words.length; i++) {
    if (!isAllowedMidWord(words[i]) && /^[A-Z]/.test(words[i])) return words[i];
  }
  return null;
}

function toSentenceCaseSuggestion(str: string): string {
  return str
    .trim()
    .split(/\s+/)
    .map((word, i) => {
      if (i === 0 || isAllowedMidWord(word)) return word;
      return word.charAt(0).toLowerCase() + word.slice(1);
    })
    .join(' ');
}

export const MESSAGES = {
  brandMismatch:
    '"{{message}}" is a known brand/trademark term — use the exact casing "{{expected}}".',
  sentenceCase:
    'Navigation title "{{message}}" should use sentence case (e.g. "{{suggestion}}").' +
    ' Only the first word, acronyms, and brand names should be capitalised.' +
    ' If "{{word}}" is a brand term that must be capitalised, add it to BRAND_GLOSSARY' +
    ' in nav_link_should_use_sentence_case.ts.',
} as const;

export const NavLinkShouldUseSentenceCase: Rule.RuleModule = {
  meta: {
    type: 'suggestion',
    docs: {
      description:
        'Navigation link titles must use sentence case. Known brand/trademark terms must' +
        ' match their exact canonical casing from BRAND_GLOSSARY. Grandfathered terms in' +
        ' KNOWN_TERMS are silently accepted as-is.',
      url: 'https://github.com/elastic/kibana/blob/main/packages/kbn-eslint-plugin-i18n/rules/nav_link_should_use_sentence_case.ts',
    },
    messages: MESSAGES,
    schema: [],
  },

  create(context) {
    // Only activate in files that import from @kbn/core-chrome-browser.
    // This avoids relying on fragile file-path globs in .eslintrc.js.
    let isNavFile = false;

    function checkString(message: string, reportNode: Rule.Node) {
      if (!message || message.includes('{')) return; // skip ICU placeholders

      const key = message.toLowerCase().trim();

      // 1. Brand / trademark term — must use exact canonical casing
      const brandEntry = findBrandEntry(key);
      if (brandEntry !== undefined) {
        if (message !== brandEntry) {
          context.report({
            node: reportNode,
            messageId: 'brandMismatch',
            data: { message, expected: brandEntry },
          });
        }
        return;
      }

      // 2. Grandfathered known term — silently accepted, no enforcement
      if (KNOWN_TERMS_MAP.has(key)) return;

      // 3. Everything else — must be sentence case
      const violatingWord = findSentenceCaseViolation(message);
      if (violatingWord) {
        context.report({
          node: reportNode,
          messageId: 'sentenceCase',
          data: { message, suggestion: toSentenceCaseSuggestion(message), word: violatingWord },
        });
      }
    }

    return {
      ImportDeclaration(node) {
        const importNode = node as TSESTree.ImportDeclaration;
        if (importNode.source.value === '@kbn/core-chrome-browser') {
          isNavFile = true;
        }
      },

      // i18n.translate('key', { defaultMessage: '...' })
      CallExpression(node) {
        if (!isNavFile) return;

        const { callee } = node as TSESTree.CallExpression;

        if (
          callee.type !== AST_NODE_TYPES.MemberExpression ||
          callee.object.type !== AST_NODE_TYPES.Identifier ||
          callee.property.type !== AST_NODE_TYPES.Identifier ||
          callee.object.name !== 'i18n' ||
          callee.property.name !== 'translate'
        ) {
          return;
        }

        const args = (node as TSESTree.CallExpression).arguments;
        if (args.length < 2) return;

        const optionsArg = args[1];
        if (optionsArg.type !== AST_NODE_TYPES.ObjectExpression) return;

        const defaultMessageProp = optionsArg.properties.find(
          (p): p is TSESTree.Property =>
            p.type === AST_NODE_TYPES.Property &&
            p.key.type === AST_NODE_TYPES.Identifier &&
            (p.key as TSESTree.Identifier).name === 'defaultMessage'
        );

        if (!defaultMessageProp) return;
        const valueNode = defaultMessageProp.value;
        if (valueNode.type !== AST_NODE_TYPES.Literal || typeof valueNode.value !== 'string')
          return;

        checkString(valueNode.value, valueNode as unknown as Rule.Node);
      },

      // Raw label/title string properties in direct nav data
      Property(node) {
        if (!isNavFile) return;

        const prop = node as TSESTree.Property;

        if (
          prop.key.type !== AST_NODE_TYPES.Identifier ||
          !(['label', 'title'] as string[]).includes((prop.key as TSESTree.Identifier).name)
        ) {
          return;
        }

        const valueNode = prop.value;
        if (valueNode.type !== AST_NODE_TYPES.Literal || typeof valueNode.value !== 'string')
          return;

        checkString(valueNode.value, valueNode as unknown as Rule.Node);
      },
    };
  },
};
