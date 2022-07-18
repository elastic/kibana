/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import Eslint from 'eslint';
import { SomeNode } from './visit_all_import_statements';

interface ReportOptions {
  node: SomeNode;
  message: string;
  correctImport?: string;
}

/**
 * Simple wrapper around context.report so that the types work better with typescript-estree
 */
export function report(context: Eslint.Rule.RuleContext, options: ReportOptions) {
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
