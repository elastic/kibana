/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { binaryExpressionGroup } from '../ast/helpers';
import { ESQLAstBaseItem, ESQLAstCommand, ESQLAstQueryExpression } from '../types';
import { ESQLAstExpressionNode, Visitor } from '../visitor';
import { LeafPrinter } from './leaf_printer';

export interface BasicPrettyPrinterOptions {
  /**
   * Whether to break the query into multiple lines on each pipe. Defaults to
   * `false`.
   */
  multiline?: boolean;

  /**
   * Tabbing string inserted before a pipe, when `multiline` is `true`. Defaults
   * to two spaces.
   */
  pipeTab?: string;

  /**
   * The default lowercase setting to use for all options. Defaults to `false`.
   */
  lowercase?: boolean;

  /**
   * Whether to lowercase command names. Defaults to `false`.
   */
  lowercaseCommands?: boolean;

  /**
   * Whether to lowercase command options. Defaults to `false`.
   */
  lowercaseOptions?: boolean;

  /**
   * Whether to lowercase function names. Defaults to `false`.
   */
  lowercaseFunctions?: boolean;

  /**
   * Whether to lowercase keywords. Defaults to `false`.
   */
  lowercaseKeywords?: boolean;
}

export type BasicPrettyPrinterMultilineOptions = Omit<BasicPrettyPrinterOptions, 'multiline'>;

export class BasicPrettyPrinter {
  /**
   * @param query ES|QL query AST to print.
   * @returns A single-line string representation of the query.
   */
  public static readonly print = (
    query: ESQLAstQueryExpression,
    opts?: BasicPrettyPrinterOptions
  ): string => {
    const printer = new BasicPrettyPrinter(opts);
    return printer.print(query);
  };

  /**
   * Print a query with each command on a separate line. It is also possible to
   * specify a tabbing option for the pipe character.
   *
   * @param query ES|QL query AST to print.
   * @param opts Options for pretty-printing.
   * @returns A multi-line string representation of the query.
   */
  public static readonly multiline = (
    query: ESQLAstQueryExpression,
    opts?: BasicPrettyPrinterMultilineOptions
  ): string => {
    const printer = new BasicPrettyPrinter({ ...opts, multiline: true });
    return printer.print(query);
  };

  /**
   * @param command ES|QL command AST node to print.
   * @returns Prints a single-line string representation of the command.
   */
  public static readonly command = (
    command: ESQLAstCommand,
    opts?: BasicPrettyPrinterOptions
  ): string => {
    const printer = new BasicPrettyPrinter(opts);
    return printer.printCommand(command);
  };

  /**
   * @param expression ES|QL expression AST node to print.
   * @returns Prints a single-line string representation of the expression.
   */
  public static readonly expression = (
    expression: ESQLAstExpressionNode,
    opts?: BasicPrettyPrinterOptions
  ): string => {
    const printer = new BasicPrettyPrinter(opts);
    return printer.printExpression(expression);
  };

  protected readonly opts: Required<BasicPrettyPrinterOptions>;

  constructor(opts: BasicPrettyPrinterOptions = {}) {
    this.opts = {
      pipeTab: opts.pipeTab ?? '  ',
      multiline: opts.multiline ?? false,
      lowercase: opts.lowercase ?? false,
      lowercaseCommands: opts.lowercaseCommands ?? opts.lowercase ?? false,
      lowercaseOptions: opts.lowercaseOptions ?? opts.lowercase ?? false,
      lowercaseFunctions: opts.lowercaseFunctions ?? opts.lowercase ?? false,
      lowercaseKeywords: opts.lowercaseKeywords ?? opts.lowercase ?? false,
    };
  }

  protected keyword(word: string) {
    return this.opts.lowercaseKeywords ?? this.opts.lowercase
      ? word.toLowerCase()
      : word.toUpperCase();
  }

  protected decorateWithComments(node: ESQLAstBaseItem, formatted: string): string {
    const formatting = node.formatting;

    if (!formatting) {
      return formatted;
    }

    if (formatting.left) {
      const comments = LeafPrinter.commentList(formatting.left);

      if (comments) {
        formatted = `${comments} ${formatted}`;
      }
    }

    if (formatting.right) {
      const comments = LeafPrinter.commentList(formatting.right);

      if (comments) {
        formatted = `${formatted} ${comments}`;
      }
    }

    return formatted;
  }

  protected readonly visitor: Visitor<any> = new Visitor()
    .on('visitExpression', (ctx) => {
      return '<EXPRESSION>';
    })

    .on('visitSourceExpression', (ctx) => {
      const formatted = LeafPrinter.source(ctx.node);
      return this.decorateWithComments(ctx.node, formatted);
    })

    .on('visitColumnExpression', (ctx) => {
      const formatted = LeafPrinter.column(ctx.node);
      return this.decorateWithComments(ctx.node, formatted);
    })

    .on('visitLiteralExpression', (ctx) => {
      const formatted = LeafPrinter.literal(ctx.node);
      return this.decorateWithComments(ctx.node, formatted);
    })

    .on('visitTimeIntervalLiteralExpression', (ctx) => {
      const formatted = LeafPrinter.timeInterval(ctx.node);
      return this.decorateWithComments(ctx.node, formatted);
    })

    .on('visitInlineCastExpression', (ctx) => {
      const value = ctx.value();
      const wrapInBrackets =
        value.type !== 'literal' &&
        value.type !== 'column' &&
        !(value.type === 'function' && value.subtype === 'variadic-call');

      let valueFormatted = ctx.visitValue();

      if (wrapInBrackets) {
        valueFormatted = `(${valueFormatted})`;
      }

      const typeName = this.keyword(ctx.node.castType);
      const formatted = `${valueFormatted}::${typeName}`;

      return this.decorateWithComments(ctx.node, formatted);
    })

    .on('visitListLiteralExpression', (ctx) => {
      let elements = '';

      for (const arg of ctx.visitElements()) {
        elements += (elements ? ', ' : '') + arg;
      }

      const formatted = `[${elements}]`;

      return this.decorateWithComments(ctx.node, formatted);
    })

    .on('visitFunctionCallExpression', (ctx) => {
      const opts = this.opts;
      const node = ctx.node;

      let operator = ctx.operator();

      switch (node.subtype) {
        case 'unary-expression': {
          operator = this.keyword(operator);

          const formatted = `${operator} ${ctx.visitArgument(0, undefined)}`;

          return this.decorateWithComments(ctx.node, formatted);
        }
        case 'postfix-unary-expression': {
          operator = this.keyword(operator);

          const formatted = `${ctx.visitArgument(0)} ${operator}`;

          return this.decorateWithComments(ctx.node, formatted);
        }
        case 'binary-expression': {
          operator = this.keyword(operator);

          const group = binaryExpressionGroup(ctx.node);
          const [left, right] = ctx.arguments();
          const groupLeft = binaryExpressionGroup(left);
          const groupRight = binaryExpressionGroup(right);

          let leftFormatted = ctx.visitArgument(0);
          let rightFormatted = ctx.visitArgument(1);

          if (groupLeft && groupLeft < group) {
            leftFormatted = `(${leftFormatted})`;
          }

          if (groupRight && groupRight < group) {
            rightFormatted = `(${rightFormatted})`;
          }

          const formatted = `${leftFormatted} ${operator} ${rightFormatted}`;

          return this.decorateWithComments(ctx.node, formatted);
        }
        default: {
          if (opts.lowercaseFunctions) {
            operator = operator.toLowerCase();
          }

          let args = '';

          for (const arg of ctx.visitArguments()) {
            args += (args ? ', ' : '') + arg;
          }

          const formatted = `${operator}(${args})`;

          return this.decorateWithComments(ctx.node, formatted);
        }
      }
    })

    .on('visitRenameExpression', (ctx) => {
      const formatted = `${ctx.visitArgument(0)} ${this.keyword('AS')} ${ctx.visitArgument(1)}`;

      return this.decorateWithComments(ctx.node, formatted);
    })

    .on('visitOrderExpression', (ctx) => {
      const node = ctx.node;
      let text = ctx.visitArgument(0);

      if (node.order) {
        text += ` ${node.order}`;
      }

      if (node.nulls) {
        text += ` ${node.nulls}`;
      }

      return text;
    })

    .on('visitCommandOption', (ctx) => {
      const opts = this.opts;
      const option = opts.lowercaseOptions ? ctx.node.name : ctx.node.name.toUpperCase();

      let args = '';

      for (const arg of ctx.visitArguments()) {
        args += (args ? ', ' : '') + arg;
      }

      const argsFormatted = args ? ` ${args}` : '';
      const optionFormatted = `${option}${argsFormatted}`;

      return optionFormatted;
    })

    .on('visitCommand', (ctx) => {
      const opts = this.opts;
      const cmd = opts.lowercaseCommands ? ctx.node.name : ctx.node.name.toUpperCase();

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
      const opts = this.opts;
      const cmdSeparator = opts.multiline ? `\n${opts.pipeTab ?? '  '}| ` : ' | ';
      let text = '';

      for (const cmd of ctx.visitCommands()) {
        if (text) text += cmdSeparator;
        text += cmd;
      }

      return text;
    });

  public print(query: ESQLAstQueryExpression) {
    return this.visitor.visitQuery(query, undefined);
  }

  public printCommand(command: ESQLAstCommand) {
    return this.visitor.visitCommand(command, undefined);
  }

  public printExpression(expression: ESQLAstExpressionNode) {
    return this.visitor.visitExpression(expression, undefined);
  }
}
