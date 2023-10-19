/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import { TSESTree } from '@typescript-eslint/typescript-estree';
import { lowerCaseFirstLetter, upperCaseFirstLetter } from './utils';

export function getIntentFromNode(originalNode: TSESTree.JSXText): string {
  const value = lowerCaseFirstLetter(
    originalNode.value
      .replace(/[?!@#$%^&*()_+\][{}|/<>,'"]/g, '')
      .trim()
      .split(' ')
      .filter((v, i) => i < 4)
      .map(upperCaseFirstLetter)
      .join('')
  );

  const { parent } = originalNode;

  if (
    parent &&
    'openingElement' in parent &&
    'name' in parent.openingElement &&
    'name' in parent.openingElement.name
  ) {
    const parentTagName = String(parent.openingElement.name.name);

    if (parentTagName.includes('Eui')) {
      return `${value}${parentTagName.replace('Eui', '')}Label`;
    }

    return `${lowerCaseFirstLetter(parentTagName)}.${value}Label`;
  }

  return `${value}Label`;
}
