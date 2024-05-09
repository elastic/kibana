/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { TSESTree } from '@typescript-eslint/typescript-estree';
import type { Rule } from 'eslint';
import { getIntentFromNode } from '../helpers/get_intent_from_node';
import { getI18nIdentifierFromFilePath } from '../helpers/get_i18n_identifier_from_file_path';
import { getFunctionName } from '../helpers/get_function_name';
import { getI18nImportFixer } from '../helpers/get_i18n_import_fixer';
import { getTranslatableValueFromString, isTruthy } from '../helpers/utils';

export const RULE_WARNING_MESSAGE =
  'Strings should be translated with i18n. Use the autofix suggestion or add your own.';

export const StringsShouldBeTranslatedWithI18n: Rule.RuleModule = {
  meta: {
    type: 'suggestion',
    fixable: 'code',
  },
  create(context) {
    const { cwd, filename, getScope, sourceCode, report } = context;

    return {
      JSXText: (node: TSESTree.JSXText) => {
        const value = getTranslatableValueFromString(node.value);

        // If the JSXText element is empty or untranslatable we don't need to do anything
        if (!value) return;

        // Get the whitespaces before the string so we can add them to the autofix suggestion
        const regex = /^(\s*)(\S)(.*)/;
        const whiteSpaces = node.value.match(regex)?.[1] ?? '';

        // Start building the translation ID suggestion
        const intent = getIntentFromNode(value, node.parent);
        if (intent === false) return;

        const i18nAppId = getI18nIdentifierFromFilePath(filename, cwd);
        const functionDeclaration = getScope().block as TSESTree.FunctionDeclaration;
        const functionName = getFunctionName(functionDeclaration);

        const translationIdSuggestion = `${i18nAppId}.${functionName}.${intent}`; // 'xpack.observability.overview.logs.loadMoreLabel'

        // Check if i18n has already been imported into the file
        const { hasI18nImportLine, i18nImportLine, rangeToAddI18nImportLine, replaceMode } =
          getI18nImportFixer({
            sourceCode,
            translationFunction: 'i18n.translate',
          });

        // Show warning to developer and offer autofix suggestion
        report({
          node: node as any,
          message: RULE_WARNING_MESSAGE,
          fix(fixer) {
            return [
              fixer.replaceText(
                node,
                `${whiteSpaces}{i18n.translate('${translationIdSuggestion}', { defaultMessage: '${value}' })}`
              ),
              !hasI18nImportLine && rangeToAddI18nImportLine
                ? replaceMode === 'replace'
                  ? fixer.replaceTextRange(rangeToAddI18nImportLine, i18nImportLine)
                  : fixer.insertTextAfterRange(rangeToAddI18nImportLine, `\n${i18nImportLine}`)
                : null,
            ].filter(isTruthy);
          },
        });
      },
      JSXAttribute: (node: TSESTree.JSXAttribute) => {
        if (
          node.name.name !== 'aria-label' &&
          node.name.name !== 'label' &&
          node.name.name !== 'title'
        )
          return;

        let val: string = '';

        // label={'foo'}
        if (
          node.value &&
          'expression' in node.value &&
          'value' in node.value.expression &&
          typeof node.value.expression.value === 'string'
        ) {
          val = getTranslatableValueFromString(node.value.expression.value);
        }

        // label="foo"
        if (node.value && 'value' in node.value && typeof node.value.value === 'string') {
          val = getTranslatableValueFromString(node.value.value);
        }

        if (!val) return;

        // Start building the translation ID suggestion
        const intent = getIntentFromNode(val, node);
        if (intent === false) return;

        const i18nAppId = getI18nIdentifierFromFilePath(filename, cwd);
        const functionDeclaration = getScope().block as TSESTree.FunctionDeclaration;
        const functionName = getFunctionName(functionDeclaration);

        const translationIdSuggestion = `${i18nAppId}.${functionName}.${intent}`; // 'xpack.observability.overview.logs.loadMoreLabel'

        // Check if i18n has already been imported into the file.
        const { hasI18nImportLine, i18nImportLine, rangeToAddI18nImportLine, replaceMode } =
          getI18nImportFixer({
            sourceCode,
            translationFunction: 'i18n.translate',
          });

        // Show warning to developer and offer autofix suggestion
        report({
          node: node as any,
          message: RULE_WARNING_MESSAGE,
          fix(fixer) {
            return [
              fixer.replaceTextRange(
                node.value!.range,
                `{i18n.translate('${translationIdSuggestion}', { defaultMessage: '${val}' })}`
              ),
              !hasI18nImportLine && rangeToAddI18nImportLine
                ? replaceMode === 'replace'
                  ? fixer.replaceTextRange(rangeToAddI18nImportLine, i18nImportLine)
                  : fixer.insertTextAfterRange(rangeToAddI18nImportLine, `\n${i18nImportLine}`)
                : null,
            ].filter(isTruthy);
          },
        });
      },
    } as Rule.RuleListener;
  },
};
