/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { TSESTree } from '@typescript-eslint/typescript-estree';
import type { Rule } from 'eslint';
import { getI18nIdentifierFromFilePath } from '../helpers/get_i18n_identifier_from_file_path';
import { getFunctionName } from '../helpers/get_function_name';
import { getI18nImportFixer } from '../helpers/get_i18n_import_fixer';
import { isTruthy } from '../helpers/utils';

export const RULE_WARNING_MESSAGE =
  'First parameter passed to i18n.translate should start with the correct i18n identifier for this file. Correct it or use the autofix suggestion.';

export const I18nTranslateShouldStartWithTheRightId: Rule.RuleModule = {
  meta: {
    type: 'suggestion',
    fixable: 'code',
  },
  create(context) {
    const { cwd, filename, getScope, sourceCode, report } = context;

    return {
      CallExpression: (node: TSESTree.CallExpression) => {
        const { callee } = node;

        if (
          !callee ||
          !('object' in callee) ||
          !('property' in callee) ||
          !('name' in callee.object) ||
          !('name' in callee.property) ||
          callee.object.name !== 'i18n' ||
          callee.property.name !== 'translate'
        )
          return;

        const identifier =
          Array.isArray(node.arguments) &&
          node.arguments.length &&
          'value' in node.arguments[0] &&
          typeof node.arguments[0].value === 'string' &&
          node.arguments[0].value;

        const i18nAppId = getI18nIdentifierFromFilePath(filename, cwd);
        const functionDeclaration = getScope().block as TSESTree.FunctionDeclaration;
        const functionName = getFunctionName(functionDeclaration);

        // Check if i18n has already been imported into the file
        const { hasI18nImportLine, i18nImportLine, rangeToAddI18nImportLine, replaceMode } =
          getI18nImportFixer({
            sourceCode,
            translationFunction: 'i18n.translate',
          });

        if (!identifier) {
          report({
            node: node as any,
            message: RULE_WARNING_MESSAGE,
            fix(fixer) {
              return [
                fixer.replaceTextRange(
                  node.range,
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

        if (identifier && !identifier.startsWith(`${i18nAppId}.`)) {
          const oldI18nIdentifierArray = identifier.split('.');

          const newI18nIdentifier =
            oldI18nIdentifierArray[0] === 'xpack'
              ? `${i18nAppId}.${oldI18nIdentifierArray.slice(2).join('.')}`
              : `${i18nAppId}.${oldI18nIdentifierArray.slice(1).join('.')}`;

          let defaultMessage = '';

          if (
            node.arguments[1] &&
            'properties' in node.arguments[1] &&
            node.arguments[1].properties.length &&
            'value' in node.arguments[1].properties[0] &&
            node.arguments[1].properties[0].value &&
            'value' in node.arguments[1].properties[0].value &&
            typeof node.arguments[1].properties[0].value.value === 'string'
          ) {
            defaultMessage = node.arguments[1].properties[0].value.value;
          }

          report({
            node: node as any,
            message: RULE_WARNING_MESSAGE,
            fix(fixer) {
              return fixer.replaceTextRange(
                node.range,
                `i18n.translate('${newI18nIdentifier}', { defaultMessage: '${defaultMessage}' })`
              );
            },
          });
        }
      },
    } as Rule.RuleListener;
  },
};
