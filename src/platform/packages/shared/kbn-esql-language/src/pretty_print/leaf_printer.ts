/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { quotableKeywords } from './utils';
import type {
  ESQLAstComment,
  ESQLAstCommentMultiLine,
  ESQLColumn,
  ESQLDatePeriodLiteral,
  ESQLIdentifier,
  ESQLLiteral,
  ESQLParam,
  ESQLParamLiteral,
  ESQLProperNode,
  ESQLSource,
  ESQLStringLiteral,
  ESQLTimeDurationLiteral,
} from '../types';

const regexUnquotedIdPattern = /^([a-z\*_\@]{1})[a-z0-9_\*]*$/i;

/**
 * Printer for leaf AST nodes. The printing output of these nodes should
 * typically not depend on word wrapping settings, should always return an
 * atomic short string.
 */
export const LeafPrinter = {
  source: (node: ESQLSource): string => {
    const { index, name, prefix, selector } = node;
    let text = (index ? LeafPrinter.string(index) : name) || '';

    if (prefix) {
      text = `${LeafPrinter.string(prefix)}:${text}`;
    }
    if (selector) {
      text = `${text}::${LeafPrinter.string(selector)}`;
    }

    return text;
  },

  identifier: (node: ESQLIdentifier) => {
    const name = node.name;
    const isKeyword = quotableKeywords().has(name.toUpperCase());
    const isQuotationNeeded = !regexUnquotedIdPattern.test(name);

    if (isKeyword || isQuotationNeeded) {
      // Escape backticks "`" with double backticks "``".
      const escaped = name.replace(/`/g, '``');

      return '`' + escaped + '`';
    } else {
      return name;
    }
  },

  column: (node: ESQLColumn) => {
    const printColumnFromArgs = (args: (ESQLIdentifier | ESQLParam)[]) => {
      return args.map(LeafPrinter.print).join('.');
    };

    if (node.qualifier) {
      return `[${LeafPrinter.identifier(node.qualifier)}].[${printColumnFromArgs(
        // Removes the first argument which is the already printed qualifier
        node.args.slice(1)
      )}]`;
    } else {
      return printColumnFromArgs(node.args);
    }
  },

  string: (node: Pick<ESQLStringLiteral, 'valueUnquoted' | 'unquoted'>) => {
    const str = node.valueUnquoted;

    if (node.unquoted === true) {
      return str;
    }

    const strFormatted =
      '"' +
      str
        .replace(/\\/g, '\\\\')
        .replace(/"/g, '\\"')
        .replace(/\n/g, '\\n')
        .replace(/\r/g, '\\r')
        .replace(/\t/g, '\\t') +
      '"';

    return strFormatted;
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
        return LeafPrinter.string(node);
      }
      case 'date_period':
      case 'time_duration': {
        return LeafPrinter.timespan(node);
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
    const paramKind = node.paramKind || '?';

    switch (node.paramType) {
      case 'named':
      case 'positional':
        return paramKind + node.value;
      default:
        return paramKind;
    }
  },

  timespan: (node: ESQLTimeDurationLiteral | ESQLDatePeriodLiteral) => {
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

  print: (node: ESQLProperNode | ESQLAstComment): string => {
    switch (node.type) {
      case 'source': {
        return LeafPrinter.source(node);
      }
      case 'identifier': {
        return LeafPrinter.identifier(node);
      }
      case 'column': {
        return LeafPrinter.column(node);
      }
      case 'literal': {
        return LeafPrinter.literal(node);
      }
      case 'comment': {
        return LeafPrinter.comment(node);
      }
    }
    return '';
  },
};
