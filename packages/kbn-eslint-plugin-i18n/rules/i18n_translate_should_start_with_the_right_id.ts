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
import { getI18nIdentifierFromFilePath } from '../helpers/get_i18n_identifier_from_file_path';
import { getAppIdFromFilePath } from '../helpers/get_app_id_from_file_path';
import { getFunctionName } from '../helpers/get_function_name';
import { getI18nImportFixer } from '../helpers/get_i18n_import_fixer';
import { getStringValue, isTruthy } from '../helpers/utils';

export const RULE_WARNING_MESSAGE =
  'First parameter passed to i18n.translate should start with the correct i18n identifier for this file. Correct it or use the autofix suggestion.';

export const NO_IDENTIFIER_MESSAGE =
  'APP_ID does not have an i18n identifier added to i18nrc.json yet. Translations for this plugin or package will not work until one is added.';

export const I18nTranslateShouldStartWithTheRightId: Rule.RuleModule = {
  meta: {
    type: 'suggestion',
    fixable: 'code',
  },
  create(context) {
    const { cwd, filename, sourceCode, report } = context;

    return {
      CallExpression(node) {
        const { callee } = node as TSESTree.CallExpression;

        // Check if callee is i18n.translate (MemberExpression with specific identifiers)
        if (
          callee.type !== AST_NODE_TYPES.MemberExpression ||
          callee.object.type !== AST_NODE_TYPES.Identifier ||
          callee.property.type !== AST_NODE_TYPES.Identifier ||
          callee.object.name !== 'i18n' ||
          callee.property.name !== 'translate'
        ) {
          return;
        }

        const callExprNode = node as TSESTree.CallExpression;
        const args = callExprNode.arguments;
        const i18nAppId = getI18nIdentifierFromFilePath(filename, cwd);

        // If no i18n identifier is found for this file, report an error
        if (!i18nAppId) {
          // Find the package/plugin ID from kibana.jsonc to show in the error message
          const appId = getAppIdFromFilePath(filename, cwd);

          report({
            node,
            message: NO_IDENTIFIER_MESSAGE.replace('APP_ID', appId),
          });
          return;
        }

        // Check if the first argument is a ternary expression (ConditionalExpression)
        // If so, validate both branches have correct i18n identifiers
        if (args.length > 0 && args[0].type === AST_NODE_TYPES.ConditionalExpression) {
          const conditionalExpr = args[0];
          const consequentValue = getStringValue(conditionalExpr.consequent);
          const alternateValue = getStringValue(conditionalExpr.alternate);

          // If both branches are valid strings starting with the correct prefix, skip reporting
          if (
            consequentValue &&
            alternateValue &&
            consequentValue.startsWith(`${i18nAppId}.`) &&
            alternateValue.startsWith(`${i18nAppId}.`)
          ) {
            return;
          }
        }

        const identifier = args.length > 0 ? getStringValue(args[0]) : false;

        const functionDeclaration = sourceCode.getScope(node).block as TSESTree.FunctionDeclaration;
        const functionName = getFunctionName(functionDeclaration);

        // Check if i18n has already been imported into the file
        const { hasI18nImportLine, i18nImportLine, rangeToAddI18nImportLine, replaceMode } =
          getI18nImportFixer({
            sourceCode,
            translationFunction: 'i18n.translate',
          });

        // If the identifier is not a string literal, report an error
        if (!identifier) {
          report({
            node,
            message: RULE_WARNING_MESSAGE,
            fix(fixer) {
              return [
                fixer.replaceTextRange(
                  callExprNode.range,
                  `i18n.translate('${i18nAppId}.${functionName}.', { defaultMessage: '' })`
                ),
                !hasI18nImportLine && rangeToAddI18nImportLine
                  ? replaceMode === 'replace'
                    ? fixer.replaceTextRange(rangeToAddI18nImportLine, i18nImportLine)
                    : fixer.insertTextAfterRange(rangeToAddI18nImportLine, `\n${i18nImportLine}`)
                  : null,
              ].filter(isTruthy);
            },
          });
        }

        // If the identifier is a string literal but does not start with the correct i18n identifier, report an error
        if (identifier && !identifier.startsWith(`${i18nAppId}.`)) {
          const i18nIdentifierRange = args[0].range;

          const oldI18nIdentifierArray = identifier.split('.');
          const correctI18nIdentifier =
            oldI18nIdentifierArray[0] === 'xpack'
              ? `${i18nAppId}.${oldI18nIdentifierArray.slice(2).join('.')}`
              : `${i18nAppId}.${oldI18nIdentifierArray.slice(1).join('.')}`;

          const hasExistingOpts = args.length > 1;

          report({
            node,
            message: RULE_WARNING_MESSAGE,
            fix(fixer) {
              return [
                hasExistingOpts
                  ? // if there are existing options, only replace the i18n identifier and keep the options
                    fixer.replaceTextRange(i18nIdentifierRange, `\'${correctI18nIdentifier}\'`)
                  : // if there are no existing options, add an options object with an empty default message
                    fixer.replaceTextRange(
                      i18nIdentifierRange,
                      `\'${correctI18nIdentifier}\', { defaultMessage: '' }`
                    ),
                !hasI18nImportLine && rangeToAddI18nImportLine
                  ? replaceMode === 'replace'
                    ? fixer.replaceTextRange(rangeToAddI18nImportLine, i18nImportLine)
                    : fixer.insertTextAfterRange(rangeToAddI18nImportLine, `\n${i18nImportLine}`)
                  : null,
              ].filter(isTruthy);
            },
          });
        }
      },
    };
  },
};
