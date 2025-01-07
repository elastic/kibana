/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { Rule } from 'eslint';
import { SomeNode } from './visit_all_import_statements';

interface ReportOptions {
  node: SomeNode;
  message: string;
  correctImport?: string;
}

/**
 * Simple wrapper around context.report so that the types work better with typescript-estree
 */
export function report(context: Rule.RuleContext, options: ReportOptions) {
  context.report({
    node: options.node as any,
    message: options.message,
    fix: options.correctImport
      ? (fixer) => {
          return fixer.replaceText(options.node as any, `'${options.correctImport}'`);
        }
      : null,
  });
}

export const toList = (strings: string[]) => {
  const items = strings.map((s) => `"${s}"`);
  const list = items.slice(0, -1).join(', ');
  const last = items.at(-1);
  return !list.length ? last ?? '' : `${list} or ${last}`;
};

export const formatSuggestions = (suggestions: string[]) => {
  const s = suggestions.map((l) => l.trim()).filter(Boolean);
  if (!s.length) {
    return '';
  }

  return ` \nSuggestions:\n - ${s.join('\n - ')}\n\n`;
};
