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

import { getPropValues } from '../helpers/get_prop_values';
import { getIntentFromNode } from '../helpers/get_intent_from_node';
import { getI18nIdentifierFromFilePath } from '../helpers/get_i18n_identifier_from_file_path';
import { getFunctionName } from '../helpers/get_function_name';
import { getI18nImportFixer } from '../helpers/get_i18n_import_fixer';
import {
  isTruthy,
  lowerCaseFirstChar,
  sanitizeEuiElementName,
  upperCaseFirstChar,
} from '../helpers/utils';

export const EUI_ELEMENTS = [
  'EuiButtonIcon',
  'EuiButtonEmpty',
  'EuiBetaBadge',
  'EuiSelect',
  'EuiSuperSelect',
  'EuiSelectWithWidth',
];

const PROP_NAMES = ['aria-label', 'aria-labelledby', 'iconType'];

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

        // 1. Analyze the props of the element to see if we have to do anything
        const relevantPropValues = getPropValues({
          propNames: PROP_NAMES,
          node: parent,
          getScope: () => sourceCode.getScope(node as Node),
        });

        // Element already has a prop for aria-label or aria-labelledby. We can bail out.
        if (relevantPropValues['aria-label'] || relevantPropValues['aria-labelledby']) return;

        // Start building the suggestion.

        // 2. The intention of the element (i.e. "Select date", "Submit", "Cancel")
        const intent =
          name === 'EuiButtonIcon' && relevantPropValues.iconType
            ? relevantPropValues.iconType // For EuiButtonIcon, use the iconType as the intent (i.e. 'pen', 'trash')
            : getIntentFromNode(parent);

        // 3. The element name (i.e. "Button", "Beta Badge", "Select")
        const { elementName, elementNameWithSpaces } = sanitizeEuiElementName(name);

        // Proposed default message
        const defaultMessage = `${upperCaseFirstChar(intent)} ${elementNameWithSpaces}`.trim(); // 'Actions Button'

        // 4. Set up the translation ID
        const i18nAppId = getI18nIdentifierFromFilePath(filename, cwd);

        const functionDeclaration = sourceCode.getScope(node as Node).block;
        const functionName = getFunctionName(functionDeclaration as TSESTree.FunctionDeclaration);

        const translation = [
          i18nAppId,
          functionName,
          `${intent}${upperCaseFirstChar(elementName)}`,
          'ariaLabel',
        ];

        const translationId = translation
          .filter(Boolean)
          .map((el) => lowerCaseFirstChar(el).replaceAll(' ', ''))
          .join('.'); // 'xpack.observability.overview.logs.loadMore.ariaLabel'

        // 5. Check if i18n has already been imported into the file
        const { hasI18nImportLine, i18nImportLine, rangeToAddI18nImportLine, replaceMode } =
          getI18nImportFixer({
            sourceCode,
            translationFunction: 'i18n.translate',
          });

        // 6. Report feedback to engineer
        report({
          node: node as any,
          message: `<${name}> should have a \`aria-label\` for a11y. Use the autofix suggestion or add your own.`,
          fix(fixer) {
            return [
              fixer.insertTextAfterRange(
                range,
                ` aria-label={i18n.translate('${translationId}', { defaultMessage: '${defaultMessage}' })}`
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
