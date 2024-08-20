/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { ESQLColumn, ESQLLiteral, ESQLSource, ESQLTimeInterval } from '../types';

const regexUnquotedIdPattern = /^([a-z\*_\@]{1})[a-z0-9_\*]*$/i;

/**
 * Printer for leaf AST nodes. The printing output of these nodes should
 * typically not depend on word wrapping settings, should always return an
 * atomic short string.
 */
export const LeafPrinter = {
  source: (node: ESQLSource) => node.name,

  /**
   * @todo: Add support for: (1) escaped characters, (2) nested fields.
   *
   * See: https://github.com/elastic/kibana/issues/189913
   */
  column: (node: ESQLColumn) => {
    // In the future "column" nodes will have a "parts" field that will be used
    // specify the parts of the column name.
    const parts: string[] = [node.text];

    let formatted = '';

    for (const part of parts) {
      if (formatted.length > 0) {
        formatted += '.';
      }
      if (regexUnquotedIdPattern.test(part)) {
        formatted += part;
      } else {
        // Escape backticks "`" with double backticks "``".
        const escaped = part.replace(/`/g, '``');
        formatted += '`' + escaped + '`';
      }
    }

    return formatted;
  },

  literal: (node: ESQLLiteral) => {
    switch (node.literalType) {
      case 'null': {
        return 'NULL';
      }
      case 'boolean': {
        return String(node.value).toUpperCase() === 'TRUE' ? 'TRUE' : 'FALSE';
      }
      case 'param': {
        switch (node.paramType) {
          case 'named':
          case 'positional':
            return '?' + node.value;
          default:
            return '?';
        }
      }
      case 'string': {
        return String(node.value);
      }
      case 'decimal': {
        const isRounded = node.value % 1 === 0;

        if (isRounded) {
          return String(node.value) + '.0';
        } else {
          return String(node.value);
        }
      }
      default: {
        return String(node.value);
      }
    }
  },

  timeInterval: (node: ESQLTimeInterval) => {
    const { quantity, unit } = node;

    if (unit.length === 1) {
      return `${quantity}${unit}`;
    } else {
      return `${quantity} ${unit}`;
    }
  },
};
