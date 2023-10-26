/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import { AST_NODE_TYPES, TSESTree } from '@typescript-eslint/typescript-estree';
import { lowerCaseFirstLetter, upperCaseFirstLetter } from './utils';

export function getIntentFromNode(value: string, parent: TSESTree.Node | undefined): string {
  const processedValue = lowerCaseFirstLetter(
    value
      .replace(/[?!@#$%^&*()_+\][{}|/<>,'"]/g, '')
      .trim()
      .split(' ')
      .filter((v, i) => i < 4)
      .map(upperCaseFirstLetter)
      .join('')
  );

  if (
    parent &&
    'openingElement' in parent &&
    'name' in parent.openingElement &&
    'name' in parent.openingElement.name
  ) {
    const parentTagName = String(parent.openingElement.name.name);

    if (parentTagName.includes('Eui')) {
      return `${processedValue}${parentTagName.replace('Eui', '')}Label`;
    }

    return `${lowerCaseFirstLetter(parentTagName)}.${processedValue}Label`;
  }

  if (
    parent &&
    'parent' in parent &&
    parent.parent &&
    'name' in parent.parent &&
    typeof parent.parent.name !== 'string' &&
    'type' in parent.parent.name &&
    parent.parent.name.type === AST_NODE_TYPES.JSXIdentifier
  ) {
    const parentTagName = String(parent.parent.name.name);

    return `${lowerCaseFirstLetter(parentTagName)}.${processedValue}Label`;
  }

  return `${processedValue}Label`;
}
