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
  'Id parameter passed to FormattedMessage should start with the correct i18n identifier for this file. Correct it or use the autofix suggestion.';

export const NO_IDENTIFIER_MESSAGE =
  'APP_ID does not have an i18n identifier added to i18nrc.json yet. Translations for this plugin or package will not work until one is added.';

export const FormattedMessageShouldStartWithTheRightId: Rule.RuleModule = {
  meta: {
    type: 'suggestion',
    fixable: 'code',
  },
  create(context) {
    const { cwd, filename, sourceCode, report } = context;

    return {
      JSXElement(node: Rule.Node) {
        const jsxNode = node as unknown as TSESTree.JSXElement;
        const { openingElement } = jsxNode;

        // Check if element is <FormattedMessage>
        if (
          openingElement.name.type !== AST_NODE_TYPES.JSXIdentifier ||
          openingElement.name.name !== 'FormattedMessage'
        ) {
          return;
        }

        // Find the id attribute
        const idAttribute = openingElement.attributes.find(
          (attr): attr is TSESTree.JSXAttribute =>
            attr.type === AST_NODE_TYPES.JSXAttribute &&
            attr.name.type === AST_NODE_TYPES.JSXIdentifier &&
            attr.name.name === 'id'
        );

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

        // Check if the id attribute is a JSX expression containing a ternary (ConditionalExpression)
        // e.g., id={isCollapsed ? 'xpack.foo.collapsed' : 'xpack.foo.expanded'}
        if (
          idAttribute?.value?.type === AST_NODE_TYPES.JSXExpressionContainer &&
          idAttribute.value.expression.type === AST_NODE_TYPES.ConditionalExpression
        ) {
          const conditionalExpr = idAttribute.value.expression;
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

        // Extract identifier from id="..." or id={'...'}
        const identifier =
          idAttribute?.value?.type === AST_NODE_TYPES.Literal &&
          typeof idAttribute.value.value === 'string'
            ? idAttribute.value.value
            : false;

        const functionDeclaration = sourceCode.getScope(node).block as TSESTree.FunctionDeclaration;
        const functionName = getFunctionName(functionDeclaration);

        // Check if i18n has already been imported into the file
        const { hasI18nImportLine, i18nImportLine, rangeToAddI18nImportLine, replaceMode } =
          getI18nImportFixer({
            sourceCode,
            translationFunction: 'FormattedMessage',
          });

        // If no identifier is found, report an error
        if (!identifier) {
          report({
            node,
            message: RULE_WARNING_MESSAGE,
            fix(fixer) {
              return [
                fixer.replaceTextRange(
                  jsxNode.range,
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

        // If the identifier does not start with the correct i18n prefix, report an error
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
            node,
            message: RULE_WARNING_MESSAGE,
            fix(fixer) {
              return [
                fixer.replaceTextRange(
                  jsxNode.range,
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
    };
  },
};
