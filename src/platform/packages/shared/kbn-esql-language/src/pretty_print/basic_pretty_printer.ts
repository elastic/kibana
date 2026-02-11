/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import {
  isBinaryExpression,
  isColumn,
  isDoubleLiteral,
  isIdentifier,
  isIntegerLiteral,
  isLiteral,
  isParamLiteral,
  isProperNode,
} from '../ast/is';
import {
  BinaryExpressionGroup,
  binaryExpressionGroup,
  unaryExpressionGroup,
} from '../ast/grouping';
import type { ESQLAstExpressionNode } from '../ast/visitor';
import { Visitor } from '../ast/visitor';
import { resolveItem } from '../ast/visitor/utils';
import {
  commandOptionsWithEqualsSeparator,
  commandsWithNoCommaArgSeparator,
  commandsWithSpecialCommaRules,
} from './constants';
import { LeafPrinter } from './leaf_printer';
import type {
  ESQLAstBaseItem,
  ESQLAstCommand,
  ESQLAstItem,
  ESQLAstQueryExpression,
  ESQLMap,
  ESQLProperNode,
} from '../types';

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
   * Whether to skip printing header commands (e.g., SET instructions).
   *
   * @default false
   */
  skipHeader?: boolean;

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

  /**
   * Map representation to use if cannot be determined from parent context.
   */
  mapRepresentation?: ESQLMap['representation'];
}

export type BasicPrettyPrinterMultilineOptions = Omit<BasicPrettyPrinterOptions, 'multiline'>;

export class BasicPrettyPrinter {
  /**
   * @param query ES|QL query AST to print.
   * @returns A single-line string representation of the query.
   */
  public static readonly print = (
    node: ESQLProperNode,
    opts?: BasicPrettyPrinterOptions
  ): string => {
    return node.type === 'query' && 'commands' in node
      ? BasicPrettyPrinter.query(node, opts)
      : node.type === 'command'
      ? BasicPrettyPrinter.command(node, opts)
      : node.type === 'header-command'
      ? BasicPrettyPrinter.command(node as any, opts)
      : BasicPrettyPrinter.expression(node, opts);
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
  ): string => BasicPrettyPrinter.print(query, { ...opts, multiline: true });

  /**
   * @param query ES|QL query AST to print.
   * @returns A single-line string representation of the query.
   */
  public static readonly query = (
    query: ESQLAstQueryExpression,
    opts?: BasicPrettyPrinterOptions
  ): string => {
    const printer = new BasicPrettyPrinter(opts);
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
      skipHeader: opts.skipHeader ?? false,
      lowercase: opts.lowercase ?? false,
      lowercaseCommands: opts.lowercaseCommands ?? opts.lowercase ?? false,
      lowercaseOptions: opts.lowercaseOptions ?? opts.lowercase ?? false,
      lowercaseFunctions: opts.lowercaseFunctions ?? opts.lowercase ?? false,
      lowercaseKeywords: opts.lowercaseKeywords ?? opts.lowercase ?? false,
      mapRepresentation: opts.mapRepresentation ?? 'map',
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

  protected simplifyMultiplicationByOne(
    node: ESQLAstExpressionNode,
    minusCount: number = 0
  ): string | undefined {
    if (isBinaryExpression(node) && node.name === '*') {
      let [left, right] = node.args;
      left = resolveItem(left);
      right = resolveItem(right);

      if (isProperNode(left) && isProperNode(right)) {
        if (!!left.formatting || !!right.formatting) {
          return undefined;
        }
        if (isIntegerLiteral(left)) {
          if (left.value === 1) {
            return this.simplifyMultiplicationByOne(right, minusCount);
          } else if (left.value === -1) {
            return this.simplifyMultiplicationByOne(right, minusCount + 1);
          }
        }
        if (isIntegerLiteral(right)) {
          if (right.value === 1) {
            return this.simplifyMultiplicationByOne(left, minusCount);
          } else if (right.value === -1) {
            return this.simplifyMultiplicationByOne(left, minusCount + 1);
          }
        }
        return undefined;
      } else {
        return undefined;
      }
    }

    const isNegative = minusCount % 2 === 1;

    if (isNegative && (isIntegerLiteral(node) || isDoubleLiteral(node)) && node.value < 0) {
      return BasicPrettyPrinter.expression(
        {
          ...node,
          value: Math.abs(node.value),
        },
        this.opts
      );
    }

    let expression = BasicPrettyPrinter.expression(node, this.opts);
    const sign = isNegative ? '-' : '';
    const needsBrackets = !!sign && !isColumn(node) && !isLiteral(node);

    if (needsBrackets) {
      expression = `(${expression})`;
    }

    return sign ? `${sign}${expression}` : expression;
  }

  protected readonly visitor: Visitor<any> = new Visitor()
    .on('visitExpression', (ctx) => {
      if (ctx.node.type === 'unknown') {
        return this.decorateWithComments(ctx.node, ctx.node.text || '<UNKNOWN>');
      }

      if (ctx.node.text) {
        let text = ctx.node.text;
        // TODO: this will be replaced by proper PromQL pretty-printing in subsequent PR
        text = text.replace(/<EOF>/g, '').trim();

        return this.decorateWithComments(ctx.node, text || '<UNKNOWN>');
      }

      return '<EXPRESSION>';
    })

    .on('visitHeaderCommand', (ctx) => {
      const opts = this.opts;
      const cmd = opts.lowercaseCommands ? ctx.node.name : ctx.node.name.toUpperCase();

      let args = '';

      for (const arg of ctx.visitArgs()) {
        args += (args ? ', ' : '') + arg;
      }

      const argsFormatted = args ? ` ${args}` : '';
      const cmdFormatted = `${cmd}${argsFormatted};`;

      return this.decorateWithComments(ctx.node, cmdFormatted);
    })

    .on('visitIdentifierExpression', (ctx) => {
      const formatted = LeafPrinter.identifier(ctx.node);
      return this.decorateWithComments(ctx.node, formatted);
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

      const subtype = ctx.node.subtype;
      const formatted =
        subtype === 'tuple'
          ? '(' + elements + ')'
          : subtype === 'bare'
          ? elements
          : '[' + elements + ']';

      return this.decorateWithComments(ctx.node, formatted);
    })

    .on('visitMapEntryExpression', (ctx) => {
      const key = ctx.visitKey();
      const value = ctx.visitValue();
      const parentNode = ctx.parent?.node as ESQLMap | undefined;
      const representation = parentNode?.representation ?? this.opts.mapRepresentation ?? 'map';
      const separator =
        representation === 'map' ? ': ' : representation === 'assignment' ? ' = ' : ' ';
      const formatted = key + separator + value;

      return this.decorateWithComments(ctx.node, formatted);
    })

    .on('visitMapExpression', (ctx) => {
      const representation = ctx.node.representation ?? 'map';
      const separator = representation === 'map' ? ', ' : ' ';
      let formatted = '';

      for (const entry of ctx.visitEntries()) {
        formatted += (formatted ? separator : '') + entry;
      }

      if (representation === 'map') {
        formatted = '{' + formatted + '}';
      }

      return this.decorateWithComments(ctx.node, formatted);
    })

    .on('visitParensExpression', (ctx) => {
      const child = ctx.visitChild();
      const formatted = `(${child})`;

      return this.decorateWithComments(ctx.node, formatted);
    })

    .on('visitFunctionCallExpression', (ctx) => {
      const opts = this.opts;
      const node = ctx.node;

      let operator = ctx.operator();

      switch (node.subtype) {
        case 'unary-expression': {
          operator = this.keyword(operator);

          const separator = operator === '-' || operator === '+' ? '' : ' ';

          const argument = ctx.arguments()[0];
          let argumentFormatted = ctx.visitArgument(0, undefined);

          const operatorPrecedence = unaryExpressionGroup(ctx.node);
          const argumentPrecedence = binaryExpressionGroup(argument);

          if (
            argumentPrecedence !== BinaryExpressionGroup.none &&
            argumentPrecedence < operatorPrecedence
          ) {
            argumentFormatted = `(${argumentFormatted})`;
          }

          const formatted = `${operator}${separator}${argumentFormatted}`;

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
          // Note: right operand may be undefined for incomplete expressions.
          // For assignments (=), left is the target name, right is the expression to assign.
          const [left, right] = ctx.arguments();

          const formatOperand = (operand: ESQLAstItem, index: number): string => {
            const operandGroup = binaryExpressionGroup(operand);
            let formatted = ctx.visitArgument(index);

            const shouldGroup =
              operandGroup &&
              (operandGroup === BinaryExpressionGroup.unknown || operandGroup < group);

            if (shouldGroup) {
              formatted = `(${formatted})`;
            }

            return formatted;
          };

          if (
            node.name === '*' &&
            ((isIntegerLiteral(left) && Math.abs(left.value) === 1) ||
              (right && isIntegerLiteral(right) && Math.abs(right.value) === 1))
          ) {
            const formatted = this.simplifyMultiplicationByOne(node);

            if (formatted) {
              return formatted;
            }
          }

          const leftFormatted = formatOperand(left, 0);
          const rightFormatted = right ? formatOperand(right, 1) : '';

          const formatted = `${leftFormatted} ${operator} ${rightFormatted}`;

          return this.decorateWithComments(ctx.node, formatted);
        }
        default: {
          // Check if function name is a parameter stored in node.operator
          if (ctx.node.operator && isParamLiteral(ctx.node.operator)) {
            operator = LeafPrinter.param(ctx.node.operator);
          } else {
            if (ctx.node.operator && isIdentifier(ctx.node.operator)) {
              operator = ctx.node.operator.name;
            }
            operator = opts.lowercaseFunctions ? operator.toLowerCase() : operator.toUpperCase();
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

      const separator = commandOptionsWithEqualsSeparator.has(ctx.node.name) ? ' = ' : ' ';
      const argsFormatted = args ? `${separator}${args}` : '';
      const optionFormatted = `${option}${argsFormatted}`;

      return this.decorateWithComments(ctx.node, optionFormatted);
    })

    .on('visitCommand', (ctx) => {
      const opts = this.opts;
      const node = ctx.node;
      const cmd = opts.lowercaseCommands ? node.name : node.name.toUpperCase();
      const cmdType = !node.commandType
        ? ''
        : (opts.lowercaseCommands ? node.commandType : node.commandType.toUpperCase()) + ' ';

      if (cmd === 'FORK') {
        const branches = node.args
          .map((branch) => {
            if (Array.isArray(branch)) {
              return undefined;
            }

            // Check for ESQLAstQueryExpression specifically (has 'commands' property)
            if (
              branch.type === 'parens' &&
              branch.child.type === 'query' &&
              'commands' in branch.child
            ) {
              return ctx.visitSubQuery(branch.child);
            }

            return undefined;
          })
          .filter(Boolean) as string[];

        const spaces = (n: number) => ' '.repeat(n);

        const branchSeparator = opts.multiline ? `)\n${spaces(4)}(` : `) (`;

        return this.decorateWithComments(
          ctx.node,
          `FORK${opts.multiline ? `\n${spaces(4)}` : ' '}(${branches.join(branchSeparator)})`
        );
      }

      let args = '';
      let options = '';

      let argIndex = 0;
      for (const source of ctx.visitArguments()) {
        const needsSeparator = !!args;

        // Check if this command has special comma rules
        const specialRule = commandsWithSpecialCommaRules.get(ctx.node.name);
        const needsComma = specialRule
          ? specialRule(argIndex)
          : !commandsWithNoCommaArgSeparator.has(ctx.node.name);

        const separator = needsSeparator ? (needsComma ? ',' : '') + ' ' : '';
        args += separator + source;
        argIndex++;
      }

      for (const option of ctx.visitOptions()) {
        options += (options ? ' ' : '') + option;
      }

      const argsFormatted = args ? ` ${args}` : '';
      const optionsFormatted = options ? ` ${options}` : '';
      const cmdFormatted = `${cmdType}${cmd}${argsFormatted}${optionsFormatted}`;

      return this.decorateWithComments(ctx.node, cmdFormatted);
    })

    .on('visitQuery', (ctx) => {
      const opts = this.opts;

      let parentNode;
      if (ctx.parent?.node && !Array.isArray(ctx.parent.node)) {
        parentNode = ctx.parent.node;
      }

      const useMultiLine =
        opts.multiline && !Array.isArray(parentNode) && parentNode?.name !== 'fork';

      const cmdSeparator = useMultiLine ? `\n${opts.pipeTab ?? '  '}| ` : ' | ';
      let text = '';

      // Print header commands first (e.g., SET instructions)
      if (!opts.skipHeader) {
        for (const headerCmd of ctx.visitHeaderCommands()) {
          if (text) text += ' ';
          text += headerCmd;
        }
      }

      let hasCommands = false;

      for (const cmd of ctx.visitCommands()) {
        if (hasCommands) {
          // Separate main commands with pipe `|`
          text += cmdSeparator;
        } else if (text) {
          // Separate header commands from main commands with just a space
          text += ' ';
        }

        text += cmd;
        hasCommands = true;
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
