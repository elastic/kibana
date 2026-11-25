/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { TSESTree } from '@typescript-eslint/typescript-estree';
import type { CreateOnceRule } from '@oxlint/plugins';
import { AST_NODE_TYPES } from '@typescript-eslint/typescript-estree';
import { getIntentFromNode } from '../helpers/get_intent_from_node';
import { getI18nIdentifierFromFilePath } from '../helpers/get_i18n_identifier_from_file_path';
import { getFunctionName } from '../helpers/get_function_name';
import { getI18nImportFixer } from '../helpers/get_i18n_import_fixer';
import { getJsxStringValue } from '../helpers/get_jsx_string_value';
import {
  getTranslatableValueFromString,
  getValueFromJSXAttribute,
  isTruthy,
} from '../helpers/utils';

export const RULE_WARNING_MESSAGE =
  'Strings should be translated with i18n. Use the autofix suggestion or add your own.';

export const StringsShouldBeTranslatedWithI18n: CreateOnceRule = {
  meta: {
    type: 'suggestion',
    fixable: 'code',
  },
  createOnce(context) {
    return {
      JSXText(node) {
        const { cwd, filename, sourceCode } = context;
        const jsxTextNode = node as unknown as TSESTree.JSXText;
        const text = getJsxStringValue(jsxTextNode);
        const value = getTranslatableValueFromString(text);

        // If the JSXText element is empty or untranslatable we don't need to do anything
        if (!value) return;

        // Get the whitespaces before the string so we can add them to the autofix suggestion
        const regex = /^(\s*)(\S)(.*)/;
        const whiteSpaces = text.match(regex)?.[1] ?? '';

        // Start building the translation ID suggestion
        const intent = getIntentFromNode(value, jsxTextNode.parent);
        if (intent === false) return;

        const i18nAppId = getI18nIdentifierFromFilePath(filename, cwd);
        const functionName = getFunctionName(sourceCode.getScope(node).block);

        const translationIdSuggestion = `${i18nAppId}.${functionName}.${intent}`;

        // Check if i18n has already been imported into the file
        const { hasI18nImportLine, i18nImportLine, rangeToAddI18nImportLine, replaceMode } =
          getI18nImportFixer({
            sourceCode,
            translationFunction: 'i18n.translate',
          });

        // Show warning to developer and offer autofix suggestion
        context.report({
          node,
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
      JSXAttribute(node) {
        const { cwd, filename, sourceCode } = context;
        const jsxAttrNode = node as unknown as TSESTree.JSXAttribute;

        // Only check specific attributes that should be translated
        if (
          jsxAttrNode.name.type !== AST_NODE_TYPES.JSXIdentifier ||
          (jsxAttrNode.name.name !== 'aria-label' &&
            jsxAttrNode.name.name !== 'label' &&
            jsxAttrNode.name.name !== 'title')
        ) {
          return;
        }

        const val = getValueFromJSXAttribute(jsxAttrNode.value);
        if (!val) return;

        // Start building the translation ID suggestion
        const intent = getIntentFromNode(val, jsxAttrNode);
        if (intent === false) return;

        const i18nAppId = getI18nIdentifierFromFilePath(filename, cwd);
        const functionName = getFunctionName(sourceCode.getScope(node).block);

        const translationIdSuggestion = `${i18nAppId}.${functionName}.${intent}`;

        // Check if i18n has already been imported into the file.
        const { hasI18nImportLine, i18nImportLine, rangeToAddI18nImportLine, replaceMode } =
          getI18nImportFixer({
            sourceCode,
            translationFunction: 'i18n.translate',
          });

        // Show warning to developer and offer autofix suggestion
        context.report({
          node,
          message: RULE_WARNING_MESSAGE,
          fix(fixer) {
            return [
              fixer.replaceTextRange(
                jsxAttrNode.value!.range,
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
    };
  },
};
