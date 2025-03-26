/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { Rule } from 'eslint';
import { AST_NODE_TYPES, TSESTree } from '@typescript-eslint/typescript-estree';
import { Node } from 'estree';

import { checkNodeForExistenceOfProps } from '../helpers/check_node_for_existence_of_props';
import { getIntentFromNode } from '../helpers/get_intent_from_node';
import { getI18nIdentifierFromFilePath } from '../helpers/get_i18n_identifier_from_file_path';
import { getFunctionName } from '../helpers/get_function_name';
import { getI18nImportFixer } from '../helpers/get_i18n_import_fixer';
import { isTruthy } from '../helpers/utils';

export const EUI_ELEMENTS = [
  'EuiButtonIcon',
  'EuiButtonEmpty',
  'EuiBetaBadge',
  'EuiSelect',
  'EuiSuperSelect',
  'EuiSelectWithWidth',
];

const PROP_NAMES = ['aria-label', 'aria-labelledby'];

export const EuiElementsShouldHaveAriaLabelOrAriaLabelledbyProps: Rule.RuleModule = {
  meta: {
    type: 'suggestion',
    fixable: 'code',
  },
  create(context) {
    const { cwd, filename, report, sourceCode } = context;

    return {
      JSXIdentifier: (node: TSESTree.Node) => {
        if (!('name' in node)) {
          return;
        }

        const name = String(node.name);
        const range = node.range;
        const parent = node.parent;

        if (parent?.type !== AST_NODE_TYPES.JSXOpeningElement || !EUI_ELEMENTS.includes(name)) {
          return;
        }

        const hasAriaLabelProp = checkNodeForExistenceOfProps(
          parent,
          () => sourceCode.getScope(node as Node),
          PROP_NAMES
        );

        if (hasAriaLabelProp) return; // JSXOpeningElement already has a prop for aria-label. Bail.

        // Start building the suggestion.

        // 1. The intention of the element (i.e. "Select date", "Submit", "Cancel")
        const intent = getIntentFromNode(parent);

        // 2. The element name that generates the events
        const element = (
          name
            .replace('Eui', '')
            .replace('Empty', '')
            .replace('Icon', '')
            .replace('WithWidth', '')
            .match(/[A-Z][a-z]*/g) || []
        ).join(' ');

        const suggestion = `${intent}${element}`; // 'Actions Button'

        const i18nAppId = getI18nIdentifierFromFilePath(filename, cwd);
        // @ts-expect-error upgrade typescript v5.1.6
        const functionDeclaration = sourceCode.getScope(node as TSNode)
          .block as TSESTree.FunctionDeclaration;
        const functionName = getFunctionName(functionDeclaration);

        const translationIdSuggestion = `${i18nAppId}.${functionName}.${intent.replaceAll(
          ' ',
          ''
        )}ariaLabel`; // 'xpack.observability.overview.logs.loadMore.ariaLabel'

        // Check if i18n has already been imported into the file
        const { hasI18nImportLine, i18nImportLine, rangeToAddI18nImportLine, replaceMode } =
          getI18nImportFixer({
            sourceCode,
            translationFunction: 'i18n.translate',
          });

        // 3. Report feedback to engineer
        report({
          node: node as any,
          message: `<${name}> should have a \`aria-label\` for a11y. Use the autofix suggestion or add your own.`,
          fix(fixer) {
            return [
              fixer.insertTextAfterRange(
                range,
                ` aria-label={i18n.translate('${translationIdSuggestion}', { defaultMessage: '${suggestion}' })}`
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
