/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { TSESTree, TSNode } from '@typescript-eslint/typescript-estree';
import type { Rule } from 'eslint';
import { getI18nIdentifierFromFilePath } from '../helpers/get_i18n_identifier_from_file_path';
import { getFunctionName } from '../helpers/get_function_name';
import { getI18nImportFixer } from '../helpers/get_i18n_import_fixer';
import { isTruthy } from '../helpers/utils';

export const RULE_WARNING_MESSAGE =
  'Id parameter passed to FormattedMessage should start with the correct i18n identifier for this file. Correct it or use the autofix suggestion.';

export const FormattedMessageShouldStartWithTheRightId: Rule.RuleModule = {
  meta: {
    type: 'suggestion',
    fixable: 'code',
  },
  create(context) {
    const { cwd, filename, sourceCode, report } = context;

    return {
      JSXElement: (node: TSESTree.JSXElement) => {
        const { openingElement } = node;

        if (!('name' in openingElement.name) || openingElement.name.name !== 'FormattedMessage') {
          return;
        }

        const idAttribute = openingElement.attributes.find(
          (attribute) => 'name' in attribute && attribute.name.name === 'id'
        ) as TSESTree.JSXAttribute;

        const identifier =
          idAttribute &&
          'value' in idAttribute &&
          idAttribute.value &&
          'value' in idAttribute.value &&
          typeof idAttribute.value.value === 'string' &&
          idAttribute.value.value;

        const i18nAppId = getI18nIdentifierFromFilePath(filename, cwd);
        const functionDeclaration = sourceCode.getScope(node as TSNode)
          .block as TSESTree.FunctionDeclaration;
        const functionName = getFunctionName(functionDeclaration);

        // Check if i18n has already been imported into the file
        const { hasI18nImportLine, i18nImportLine, rangeToAddI18nImportLine, replaceMode } =
          getI18nImportFixer({
            sourceCode,
            translationFunction: 'FormattedMessage',
          });

        if (!identifier) {
          report({
            node: node as any,
            message: RULE_WARNING_MESSAGE,
            fix(fixer) {
              return [
                fixer.replaceTextRange(
                  node.range,
                  `<FormattedMessage id="${i18nAppId}.${functionName}." defaultMessage="" />`
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

          const existingProps =
            openingElement.attributes
              .filter((attr) => attr !== idAttribute)
              .reduce(
                (acc, curr) => acc + sourceCode.getText().slice(curr.range[0], curr.range[1]),
                ''
              ) || 'defaultMessage=""';

          report({
            node: node as any,
            message: RULE_WARNING_MESSAGE,
            fix(fixer) {
              return [
                fixer.replaceTextRange(
                  node.range,
                  `<FormattedMessage id="${newI18nIdentifier}" ${existingProps} />`
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
    } as Rule.RuleListener;
  },
};
