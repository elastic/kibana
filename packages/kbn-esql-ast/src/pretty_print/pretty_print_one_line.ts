/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { ESQLAstQueryNode, Visitor } from '../visitor';

export const prettyPrintOneLine = (query: ESQLAstQueryNode) => {
  const visitor = new Visitor()
    .on('visitSourceExpression', (ctx) => {
      return ctx.node.name;
    })
    .on('visitColumnExpression', (ctx) => {
      /**
       * @todo: Add support for: (1) escaped characters, (2) nested fields.
       */
      return ctx.node.name;
    })
    .on('visitFunctionCallExpression', (ctx) => {
      const node = ctx.node;
      let operator = node.name.toUpperCase();

      switch (node.subtype) {
        case 'unary-expression': {
          return `${operator} ${ctx.visitArgument(0)}`;
        }
        case 'postfix-unary-expression': {
          return `${ctx.visitArgument(0)} ${operator}`;
        }
        case 'binary-expression': {
          /** @todo Make `operator` printable. */
          switch (operator) {
            case 'NOT_LIKE': {
              operator = 'NOT LIKE';
              break;
            }
            case 'NOT_RLIKE': {
              operator = 'NOT RLIKE';
              break;
            }
          }
          return `${ctx.visitArgument(0)} ${operator} ${ctx.visitArgument(1)}`;
        }
        default: {
          let args = '';

          for (const arg of ctx.visitArguments()) {
            args += (args ? ', ' : '') + arg;
          }

          return `${operator}(${args})`;
        }
      }
    })
    .on('visitLiteralExpression', (ctx) => {
      const node = ctx.node;

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
          return node.value;
        }
        default: {
          return String(ctx.node.value);
        }
      }
    })
    .on('visitListLiteralExpression', (ctx) => {
      let elements = '';

      for (const arg of ctx.visitElements()) {
        elements += (elements ? ', ' : '') + arg;
      }

      return `[${elements}]`;
    })
    .on('visitTimeIntervalLiteralExpression', (ctx) => {
      /** @todo Rename to `fmt`. */
      return ctx.format();
    })
    .on('visitInlineCastExpression', (ctx) => {
      /** @todo Add `.fmt()` helper. */
      return `${ctx.visitValue()}::${ctx.node.castType}`;
    })
    .on('visitExpression', (ctx) => {
      return ctx.node.text ?? '<EXPRESSION>';
    })
    .on('visitCommandOption', (ctx) => {
      const option = ctx.node.name.toUpperCase();
      let args = '';

      for (const arg of ctx.visitArguments()) {
        args += (args ? ', ' : '') + arg;
      }

      const argsFormatted = args ? ` ${args}` : '';
      const optionFormatted = `${option}${argsFormatted}`;

      return optionFormatted;
    })
    .on('visitCommand', (ctx) => {
      const cmd = ctx.node.name.toUpperCase();
      let args = '';
      let options = '';

      for (const source of ctx.visitArguments()) {
        args += (args ? ', ' : '') + source;
      }

      for (const option of ctx.visitOptions()) {
        options += (options ? ' ' : '') + option;
      }

      const argsFormatted = args ? ` ${args}` : '';
      const optionsFormatted = options ? ` ${options}` : '';
      const cmdFormatted = `${cmd}${argsFormatted}${optionsFormatted}`;

      return cmdFormatted;
    })
    .on('visitQuery', (ctx) => {
      let text = '';

      for (const cmd of ctx.visitCommands()) {
        text += (text ? ' | ' : '') + cmd;
      }

      return text;
    });

  return visitor.visitQuery(query);
};
