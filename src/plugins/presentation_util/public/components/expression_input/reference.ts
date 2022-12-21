/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { ExpressionFunction, ExpressionFunctionParameter } from '@kbn/expressions-plugin/common';
import { i18n } from '@kbn/i18n';

const BOLD_MD_TOKEN = '**';

const strings = {
  getArgReferenceAliasesDetail: (aliases: string) =>
    i18n.translate('presentationUtil.expressionInput.argReferenceAliasesDetail', {
      defaultMessage: '{BOLD_MD_TOKEN}Aliases{BOLD_MD_TOKEN}: {aliases}',
      values: {
        BOLD_MD_TOKEN,
        aliases,
      },
    }),
  getArgReferenceDefaultDetail: (defaultVal: string) =>
    i18n.translate('presentationUtil.expressionInput.argReferenceDefaultDetail', {
      defaultMessage: '{BOLD_MD_TOKEN}Default{BOLD_MD_TOKEN}: {defaultVal}',
      values: {
        BOLD_MD_TOKEN,
        defaultVal,
      },
    }),
  getArgReferenceRequiredDetail: (required: string) =>
    i18n.translate('presentationUtil.expressionInput.argReferenceRequiredDetail', {
      defaultMessage: '{BOLD_MD_TOKEN}Required{BOLD_MD_TOKEN}: {required}',
      values: {
        BOLD_MD_TOKEN,
        required,
      },
    }),
  getArgReferenceTypesDetail: (types: string) =>
    i18n.translate('presentationUtil.expressionInput.argReferenceTypesDetail', {
      defaultMessage: '{BOLD_MD_TOKEN}Types{BOLD_MD_TOKEN}: {types}',
      values: {
        BOLD_MD_TOKEN,
        types,
      },
    }),
  getFunctionReferenceAcceptsDetail: (acceptTypes: string) =>
    i18n.translate('presentationUtil.expressionInput.functionReferenceAccepts', {
      defaultMessage: '{BOLD_MD_TOKEN}Accepts{BOLD_MD_TOKEN}: {acceptTypes}',
      values: {
        BOLD_MD_TOKEN,
        acceptTypes,
      },
    }),
  getFunctionReferenceReturnsDetail: (returnType: string) =>
    i18n.translate('presentationUtil.expressionInput.functionReferenceReturns', {
      defaultMessage: '{BOLD_MD_TOKEN}Returns{BOLD_MD_TOKEN}: {returnType}',
      values: {
        BOLD_MD_TOKEN,
        returnType,
      },
    }),
};

/**
 * Given an expression function, this function returns a markdown string
 * that includes the context the function accepts, what the function returns
 * as well as the general help/documentation text associated with the function
 */
export function getFunctionReferenceStr(fnDef: ExpressionFunction) {
  const { help, type, inputTypes } = fnDef;
  const acceptTypes = inputTypes ? inputTypes.join(' | ') : 'null';
  const returnType = type ? type : 'null';

  const doc = `${strings.getFunctionReferenceAcceptsDetail(
    acceptTypes
  )} ${strings.getFunctionReferenceReturnsDetail(returnType)}
\n\n${help}`;

  return doc;
}

/**
 * Given an argument definition, this function returns a markdown string
 * that includes the aliases of the argument, types accepted for the argument,
 * the default value of the argument, whether or not its required, and
 * the general help/documentation text associated with the argument
 */
export function getArgReferenceStr(argDef: Omit<ExpressionFunctionParameter, 'accepts'>) {
  const { aliases, types, default: def, required, help } = argDef;

  const secondLineArr = [];

  if (def != null) {
    secondLineArr.push(strings.getArgReferenceDefaultDetail(String(def)));
  }

  if (aliases && aliases.length) {
    secondLineArr.push(strings.getArgReferenceAliasesDetail(aliases.join(' | ')));
  }

  const typesStr = types && types.length ? types.join(' | ') : 'null';
  const requiredStr = String(Boolean(required));

  const ref = `${strings.getArgReferenceTypesDetail(
    typesStr
  )} ${strings.getArgReferenceRequiredDetail(requiredStr)}
  \n\n${secondLineArr.join(' ')}
  \n\n${help}`;

  return ref;
}
