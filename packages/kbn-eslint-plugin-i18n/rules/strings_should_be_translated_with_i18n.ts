/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { Rule } from 'eslint';
import { TSESTree } from '@typescript-eslint/typescript-estree';

import { getIntentFromNode } from '../helpers/get_intent_from_node';
import { getAppName } from '../helpers/get_app_name';
import { getFunctionName } from '../helpers/get_function_name';
import { getI18nImportFixer } from '../helpers/get_i18n_import_fixer';
import { nonNullable } from '../helpers/non_nullable';

export const StringsShouldBeTranslatedWithI18n: Rule.RuleModule = {
  meta: {
    type: 'suggestion',
    fixable: 'code',
  },
  create(context) {
    const { cwd, filename, getScope, sourceCode, report } = context;

    return {
      JSXText: (node: TSESTree.JSXText) => {
        const value = node.value.trim();

        // If the JSXText element is empty we don't need to do anything
        if (!value) return;

        // Get the whitespaces before the string so we can add them to the autofix suggestion
        const regex = /^(\s*)(\S)(.*)/;
        const whiteSpaces = node.value.match(regex)?.[1] ?? '';

        // Start building the translation ID suggestion
        const appName = getAppName(filename, cwd);
        const functionDeclaration = getScope().block as TSESTree.FunctionDeclaration;
        const functionName = getFunctionName(functionDeclaration);
        const intent = getIntentFromNode(node);

        const suggestion = `${appName}.${functionName}.${intent}`; // 'xpack.observability.overview.logsPageLoadMoreButton'

        // Check if i18n has already been imported into the file.
        const {
          hasI18nImportLine,
          i18nPackageImportLine: i18nImportLine,
          rangeToAddI18nImportLine,
        } = getI18nImportFixer({
          sourceCode,
          mode: 'i18n.translate',
        });

        // Show warning to developer and offer autofix suggestion
        report({
          node: node as any,
          message:
            'Strings should be translated with i18n. Use the autofix suggestion or add your own.',
          fix(fixer) {
            return [
              fixer.replaceText(
                node,
                `${whiteSpaces}{i18n.translate('${suggestion}', { defaultMessage: "${value}"})}`
              ),
              !hasI18nImportLine
                ? fixer.insertTextAfterRange(rangeToAddI18nImportLine, `\n${i18nImportLine}`)
                : null,
            ].filter(nonNullable);
          },
        });
      },
    } as Rule.RuleListener;
  },
};
