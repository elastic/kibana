/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import * as TypescriptEsTree from '@typescript-eslint/typescript-estree';

export const getWrappingElement = (
  jsxOpeningElement: TypescriptEsTree.TSESTree.JSXOpeningElement
): { elementName: string; node: TypescriptEsTree.TSESTree.JSXOpeningElement } | undefined => {
  const wrapperOpeningElement = jsxOpeningElement.parent?.parent;

  if (
    wrapperOpeningElement?.type === TypescriptEsTree.AST_NODE_TYPES.JSXElement &&
    wrapperOpeningElement.openingElement.name.type === TypescriptEsTree.AST_NODE_TYPES.JSXIdentifier
  ) {
    return {
      elementName: wrapperOpeningElement.openingElement.name.name,
      node: wrapperOpeningElement.openingElement,
    };
  }

  return undefined;
};
