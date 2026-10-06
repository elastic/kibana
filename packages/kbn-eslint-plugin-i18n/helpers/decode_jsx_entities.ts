/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { TSESTree } from '@typescript-eslint/typescript-estree';
import { parse } from '@typescript-eslint/typescript-estree';

// The entity syntax typescript-estree decodes in JSX text and JSX attribute strings.
const JSX_ENTITY = /&(?:#\d+|#x[\da-fA-F]+|[0-9a-zA-Z]+);/g;

const decodedEntities = new Map<string, string>();

const decodeEntity = (entity: string) => {
  let decoded = decodedEntities.get(entity);
  if (decoded === undefined) {
    const { expression } = parse(`<>${entity}</>`, { jsx: true })
      .body[0] as TSESTree.ExpressionStatement;
    decoded = ((expression as TSESTree.JSXFragment).children[0] as TSESTree.JSXText).value;
    decodedEntities.set(entity, decoded);
  }
  return decoded;
};

/**
 * Decodes HTML entities such as `&nbsp;` in the source text of a JSX text or JSX attribute string.
 * ESLint's parsers decode them in the node's `value`, Oxlint keeps them as written, so the rules
 * decode `raw` to see the same text in both linters.
 */
export const decodeJsxEntities = (raw: string) => raw.replace(JSX_ENTITY, decodeEntity);
