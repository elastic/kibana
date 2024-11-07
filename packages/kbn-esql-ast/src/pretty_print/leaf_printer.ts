/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import {
  ESQLAstComment,
  ESQLAstCommentMultiLine,
  ESQLColumn,
  ESQLLiteral,
  ESQLParamLiteral,
  ESQLSource,
  ESQLTimeInterval,
} from '../types';

const regexUnquotedIdPattern = /^([a-z\*_\@]{1})[a-z0-9_\*]*$/i;

/**
 * Printer for leaf AST nodes. The printing output of these nodes should
 * typically not depend on word wrapping settings, should always return an
 * atomic short string.
 */
export const LeafPrinter = {
  source: (node: ESQLSource) => node.name,

  column: (node: ESQLColumn) => {
    const args = node.args;

    let formatted = '';

    for (const arg of args) {
      switch (arg.type) {
        case 'identifier': {
          const name = arg.name;

          if (formatted.length > 0) {
            formatted += '.';
          }
          if (regexUnquotedIdPattern.test(name)) {
            formatted += name;
          } else {
            // Escape backticks "`" with double backticks "``".
            const escaped = name.replace(/`/g, '``');
            formatted += '`' + escaped + '`';
          }

          break;
        }
        case 'literal': {
          if (formatted.length > 0) {
            formatted += '.';
          }

          formatted += LeafPrinter.literal(arg);

          break;
        }
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
        return LeafPrinter.param(node);
      }
      case 'keyword': {
        return String(node.value);
      }
      case 'double': {
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

  param: (node: ESQLParamLiteral) => {
    switch (node.paramType) {
      case 'named':
      case 'positional':
        return '?' + node.value;
      default:
        return '?';
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

  comment: (node: ESQLAstComment): string => {
    switch (node.subtype) {
      case 'single-line': {
        return `//${node.text}`;
      }
      case 'multi-line': {
        return `/*${node.text}*/`;
      }
      default: {
        return '';
      }
    }
  },

  commentList: (comments: ESQLAstCommentMultiLine[]): string => {
    let text = '';
    for (const comment of comments) {
      const commentText = LeafPrinter.comment(comment);
      if (commentText) text += (text ? ' ' : '') + commentText;
    }
    return text;
  },
};
