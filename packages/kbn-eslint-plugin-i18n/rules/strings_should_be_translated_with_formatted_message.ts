/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { TSESTree } from '@typescript-eslint/typescript-estree';
import type { Rule } from 'eslint';
import { getIntentFromNode } from '../helpers/get_intent_from_node';
import { getI18nIdentifierFromFilePath } from '../helpers/get_i18n_identifier_from_file_path';
import { getFunctionName } from '../helpers/get_function_name';
import { getI18nImportFixer } from '../helpers/get_i18n_import_fixer';
import { isTruthy } from '../helpers/utils';

export const StringsShouldBeTranslatedWithFormattedMessage: Rule.RuleModule = {
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
        const i18nAppId = getI18nIdentifierFromFilePath(filename, cwd);
        const functionDeclaration = getScope().block as TSESTree.FunctionDeclaration;
        const functionName = getFunctionName(functionDeclaration);
        const intent = getIntentFromNode(node);

        const translationIdSuggestion = `${i18nAppId}.${functionName}.${intent}`; // 'xpack.observability.overview.logs.loadMoreLabel'

        // Check if i18n has already been imported into the file.
        const {
          hasI18nImportLine,
          i18nPackageImportLine: i18nImportLine,
          rangeToAddI18nImportLine,
        } = getI18nImportFixer({
          sourceCode,
          mode: 'FormattedMessage',
        });

        // Show warning to developer and offer autofix suggestion
        report({
          node: node as any,
          message:
            'Strings should be translated with <FormattedMessage />. Use the autofix suggestion or add your own.',
          fix(fixer) {
            return [
              fixer.replaceText(
                node,
                `${whiteSpaces}\n<FormattedMessage
  id="${translationIdSuggestion}"
  defaultMessage="${value}"
/>`
              ),
              !hasI18nImportLine
                ? fixer.insertTextAfterRange(rangeToAddI18nImportLine, `\n${i18nImportLine}`)
                : null,
            ].filter(isTruthy);
          },
        });
      },
    } as Rule.RuleListener;
  },
};
