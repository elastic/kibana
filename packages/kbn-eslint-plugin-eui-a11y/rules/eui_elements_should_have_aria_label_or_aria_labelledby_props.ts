/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import * as EsLint from 'eslint';
import * as EsTree from 'estree';
import * as TypescriptEsTree from '@typescript-eslint/typescript-estree';

import { getPropValues } from '../helpers/get_prop_values';
import { getFunctionName } from '../helpers/get_function_name';
import { getIntentFromNode } from '../helpers/get_intent_from_node';
import { getI18nIdentifierFromFilePath } from '../helpers/get_i18n_identifier_from_file_path';
import { getI18nImportFixer } from '../helpers/get_i18n_import_fixer';
import { getWrappingElement } from '../helpers/get_wrapping_element';
import {
  isTruthy,
  lowerCaseFirstChar,
  sanitizeEuiElementName,
  upperCaseFirstChar,
} from '../helpers/utils';
import { getDefaultMessageFromI18n } from '../helpers/get_default_message_from_i18n';

export const EUI_ELEMENTS_TO_CHECK = [
  'EuiBetaBadge',
  'EuiButtonEmpty',
  'EuiButtonIcon',
  'EuiComboBox',
  'EuiSelect',
  'EuiSelectWithWidth',
  'EuiSuperSelect',
];

export const EUI_WRAPPING_ELEMENTS = ['EuiFormRow'];

export const A11Y_PROP_NAMES = ['aria-label', 'aria-labelledby', 'label'];

export const EuiElementsShouldHaveAriaLabelOrAriaLabelledbyProps: EsLint.Rule.RuleModule = {
  meta: {
    type: 'suggestion',
    fixable: 'code',
  },
  create(context) {
    const { cwd, filename, report, sourceCode } = context;
    return {
      JSXOpeningElement: (node: TypescriptEsTree.TSESTree.JSXOpeningElement) => {
        // First do a bunch of checks to see if we should even bother analyzing the node.
        if (!('name' in node && 'name' in node.name)) return;

        const { name } = node.name;

        // The element is not an element we're interested in
        if (!EUI_ELEMENTS_TO_CHECK.includes(String(name))) return;

        const wrappingElement = getWrappingElement(node);

        // The element is wrapped in an element which needs to get the a11y props instead
        if (
          wrappingElement?.elementName &&
          EUI_WRAPPING_ELEMENTS.includes(wrappingElement.elementName)
        ) {
          const props = getPropValues({
            jsxOpeningElement: wrappingElement.node,
            propNames: A11Y_PROP_NAMES,
            sourceCode,
          });

          // The wrapping element already has an a11y prop set
          if (Object.keys(props).length > 0) return;

          const reporter = checkNodeForPropNamesAndCreateReporter({
            cwd,
            filename,
            node,
            range: wrappingElement.node.name.range,
            sourceCode,
          });

          // The wrapping element does not have an a11y prop set yet, so show the reporter
          if (reporter) report(reporter);

          return;
        }

        // The element is not wrapped in an EuiFormRow
        const props = getPropValues({
          jsxOpeningElement: node,
          propNames: A11Y_PROP_NAMES,
          sourceCode,
        });

        // The element already has an a11y prop set
        if (Object.keys(props).length > 0) return;

        const reporter = checkNodeForPropNamesAndCreateReporter({
          cwd,
          filename,
          node,
          range: node.name.range,
          sourceCode,
        });

        // The element does not have an a11y prop set yet, so show the reporter
        if (reporter) report(reporter);
      },
    } as EsLint.Rule.RuleListener;
  },
};

const checkNodeForPropNamesAndCreateReporter = ({
  node,
  cwd,
  filename,
  range,
  sourceCode,
}: {
  node: TypescriptEsTree.TSESTree.JSXOpeningElement;
  cwd: string;
  filename: string;
  range: [number, number];
  sourceCode: EsLint.SourceCode;
}): EsLint.Rule.ReportDescriptor | undefined => {
  const { name } = node;

  if (name.type !== TypescriptEsTree.AST_NODE_TYPES.JSXIdentifier) return;

  const props = getPropValues({
    jsxOpeningElement: node,
    propNames: ['iconType', 'placeholder'],
    sourceCode,
  });

  // The intention of the element (i.e. "Select date", "Submit", "Cancel")
  const intent =
    props.placeholder &&
    props.placeholder.type === TypescriptEsTree.TSESTree.AST_NODE_TYPES.JSXExpressionContainer
      ? getDefaultMessageFromI18n(props.placeholder)
      : name.name === 'EuiButtonIcon' && props.iconType
      ? String(props.iconType) // For EuiButtonIcon, use the iconType as the intent (i.e. 'pen', 'trash')
      : getIntentFromNode(node);

  // The element name (i.e. "Button", "Beta Badge", "Select")
  const { elementName } = sanitizeEuiElementName(name.name);

  // 'Actions Button'
  const defaultMessage = upperCaseFirstChar(intent).trim();

  const i18nAppId = getI18nIdentifierFromFilePath(filename, cwd);

  const functionDeclaration = sourceCode.getScope(node as unknown as EsTree.Node).block;
  const functionName = getFunctionName(
    functionDeclaration as TypescriptEsTree.TSESTree.FunctionDeclaration
  );

  // 'xpack.observability.overview.logs.loadMore.ariaLabel'
  const translationId = [
    i18nAppId,
    functionName,
    `${intent}${upperCaseFirstChar(elementName)}`,
    'ariaLabel',
  ]
    .filter(Boolean)
    .map((el) => lowerCaseFirstChar(el).replaceAll(' ', ''))
    .join('.');

  // Get an additional fixer to add the i18n import line
  const { hasI18nImportLine, i18nImportLine, rangeToAddI18nImportLine, replaceMode } =
    getI18nImportFixer({
      sourceCode,
      translationFunction: 'i18n.translate',
    });

  return {
    node: node as any,
    message: `<${name.name}> should have a \`aria-label\` for a11y. Use the autofix suggestion or add your own.`,
    fix(fixer: EsLint.Rule.RuleFixer) {
      return [
        fixer.insertTextAfterRange(
          range,
          ` aria-label={i18n.translate('${translationId}', { defaultMessage: '${defaultMessage}' })} `
        ),
        !hasI18nImportLine && rangeToAddI18nImportLine
          ? replaceMode === 'replace'
            ? fixer.replaceTextRange(rangeToAddI18nImportLine, i18nImportLine)
            : fixer.insertTextAfterRange(rangeToAddI18nImportLine, `\n${i18nImportLine}`)
          : null,
      ].filter(isTruthy);
    },
  };
};
