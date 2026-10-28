/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { KueryNode } from '@kbn/es-query';
import { fromKueryExpression } from '@kbn/es-query';
import {
  KQL_NODE_TYPE_FUNCTION,
  KQL_NODE_TYPE_LITERAL,
  KQL_NODE_TYPE_WILDCARD,
} from '@kbn/es-query/src/kuery/node_types';
import type {
  KqlFunctionNode,
  KqlLiteralNode,
  KqlWildcardNode,
} from '@kbn/es-query/src/kuery/node_types';
import { KQL_WILDCARD_SYMBOL } from '@kbn/es-query/src/kuery/node_types/wildcard';

const TOKEN_PREFIX = '__wftpl_';
const TOKEN_SUFFIX = '_';
// Hex digits never include `_`, so a token can't swallow text that follows it.
const TOKEN_PATTERN = /__wftpl_([0-9a-f]*)_/g;

const textEncoder = new TextEncoder();
// Keep a leading U+FEFF: by default the decoder would drop it as a byte order mark.
const textDecoder = new TextDecoder('utf-8', { ignoreBOM: true });

const stringifyTemplateValue = (value: unknown): string => {
  if (value === null || value === undefined) {
    return '';
  }
  if (Array.isArray(value)) {
    return value.map(stringifyTemplateValue).join('');
  }
  return String(value);
};

const toHex = (text: string): string =>
  Array.from(textEncoder.encode(text), (byte) => byte.toString(16).padStart(2, '0')).join('');

const fromHex = (hex: string): string => {
  const bytes = new Uint8Array(hex.length / 2);
  for (let index = 0; index < bytes.length; index++) {
    bytes[index] = parseInt(hex.substring(index * 2, index * 2 + 2), 16);
  }
  return textDecoder.decode(bytes);
};

/**
 * Turns a rendered template value into a token made only of `[a-z0-9_]`, which KQL parses as a
 * plain term whatever the value contains. Meant to be used as the Liquid `outputEscape` of a
 * template whose output is then parsed with {@link parseKqlTemplate}.
 */
export const encodeKqlTemplateValue = (value: unknown): string =>
  `${TOKEN_PREFIX}${toHex(stringifyTemplateValue(value))}${TOKEN_SUFFIX}`;

/**
 * Replaces every token created by {@link encodeKqlTemplateValue} with the value it stands for.
 * Single pass: decoded text is never scanned again.
 */
export const decodeKqlTemplateValues = (text: string): string =>
  text.replace(TOKEN_PATTERN, (match, hex: string) =>
    hex.length % 2 === 0 ? fromHex(hex) : match
  );

const decodeNode = (node: unknown): void => {
  if (typeof node !== 'object' || node === null) {
    return;
  }
  const { type } = node as KueryNode;

  if (type === KQL_NODE_TYPE_FUNCTION) {
    (node as KqlFunctionNode).arguments.forEach(decodeNode);
    return;
  }

  if (type === KQL_NODE_TYPE_LITERAL) {
    const literal = node as KqlLiteralNode;
    if (typeof literal.value === 'string') {
      literal.value = decodeKqlTemplateValues(literal.value);
    }
    return;
  }

  if (type === KQL_NODE_TYPE_WILDCARD) {
    const wildcard = node as KqlWildcardNode;
    const decoded = decodeKqlTemplateValues(wildcard.value);
    // The wildcard marker is what makes a term match as a pattern; templated data must never be
    // able to introduce one.
    if (
      decoded.split(KQL_WILDCARD_SYMBOL).length !== wildcard.value.split(KQL_WILDCARD_SYMBOL).length
    ) {
      throw new Error('Templated values cannot introduce wildcards into a KQL condition');
    }
    wildcard.value = decoded;
  }
};

/**
 * Parses KQL that was rendered with {@link encodeKqlTemplateValue}, then swaps the tokens inside
 * literal and wildcard terms back for the values they stand for. The structure of the expression
 * comes only from the text the author wrote, never from the interpolated values.
 */
export const parseKqlTemplate = (renderedKql: string): KueryNode => {
  const ast = fromKueryExpression(renderedKql);
  decodeNode(ast);
  return ast;
};
