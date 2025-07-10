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
  isIntegerLiteral,
  isLiteral,
  isParamLiteral,
  isProperNode,
} from '../ast/is';
import { BinaryExpressionGroup, binaryExpressionGroup } from '../ast/grouping';
import { ESQLAstBaseItem, ESQLAstCommand, ESQLAstQueryExpression } from '../types';
import { ESQLAstExpressionNode, Visitor } from '../visitor';
import { resolveItem } from '../visitor/utils';
import { commandOptionsWithEqualsSeparator, commandsWithNoCommaArgSeparator } from './constants';
import { LeafPrinter } from './leaf_printer';
import { Builder } from '../builder';

type FieldValue = string | number | boolean | null;
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
    opts?: BasicPrettyPrinterOptions,
    parameters?: Array<Record<string, FieldValue> | FieldValue>
  ): string => {
    const printer = new BasicPrettyPrinter(opts, parameters);
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
  protected readonly positionalParameters: FieldValue[] = [];
  protected readonly namedParameters: Record<string, FieldValue> = {};
  protected positionalParameterIndex: number = 0;

  constructor(
    opts: BasicPrettyPrinterOptions = {},
    parameters?: Array<Record<string, FieldValue> | FieldValue>
  ) {
    this.opts = {
      pipeTab: opts.pipeTab ?? '  ',
      multiline: opts.multiline ?? false,
      lowercase: opts.lowercase ?? false,
      lowercaseCommands: opts.lowercaseCommands ?? opts.lowercase ?? false,
      lowercaseOptions: opts.lowercaseOptions ?? opts.lowercase ?? false,
      lowercaseFunctions: opts.lowercaseFunctions ?? opts.lowercase ?? false,
      lowercaseKeywords: opts.lowercaseKeywords ?? opts.lowercase ?? false,
    };

    for (const param of parameters ?? []) {
      if (typeof param === 'object') {
        Object.assign(this.namedParameters, param);
      } else {
        this.positionalParameters.push(param);
      }
    }
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

  protected decorateWithSubstitutedParameters<T extends ESQLAstBaseItem>(
    node: T,
    formatted: string
  ): string {
    if (isColumn(node)) {
      const argParam = node.args.find((arg) => isParamLiteral(arg));
      if (argParam) {
        formatted = this.replaceLiteralWithParameter(argParam, formatted);
      }
    } else if (isLiteral(node) && isParamLiteral(node)) {
      formatted = this.replaceLiteralWithParameter(node, formatted);
    }

    return this.decorateWithComments(node, formatted);
  }

  protected replaceLiteralWithParameter(node: ESQLAstExpressionNode, formatted: string): string {
    if (!isLiteral(node) || !isParamLiteral(node)) {
      return formatted;
    }

    const resolveParamValue = (): FieldValue | undefined => {
      switch (node.paramType) {
        case 'named':
        case 'positional':
          return this.namedParameters[node.value];
        default:
          return this.positionalParameters[this.positionalParameterIndex++];
      }
    };

    const buildLiteral = (value?: FieldValue) => {
      if (value === null) {
        return Builder.expression.literal.nil();
      }

      switch (typeof value) {
        case 'number':
          return Builder.expression.literal.numeric({
            value,
            literalType: Number.isInteger(value) ? 'integer' : 'double',
          });
        default:
          return Builder.expression.literal.string(String(value));
      }
    };

    const value = resolveParamValue();
    return value === undefined
      ? formatted
      : node.paramKind === '?'
      ? LeafPrinter.literal(buildLiteral(value))
      : LeafPrinter.identifier(Builder.identifier(String(value)));
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
      return '<EXPRESSION>';
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
      const formatted = this.decorateWithSubstitutedParameters(
        ctx.node,
        LeafPrinter.column(ctx.node)
      );

      return this.decorateWithComments(ctx.node, formatted);
    })

    .on('visitLiteralExpression', (ctx) => {
      const formatted = this.decorateWithSubstitutedParameters(
        ctx.node,
        LeafPrinter.literal(ctx.node)
      );

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

      const formatted = ctx.node.subtype === 'tuple' ? '(' + elements + ')' : '[' + elements + ']';

      return this.decorateWithComments(ctx.node, formatted);
    })

    .on('visitMapEntryExpression', (ctx) => {
      const key = ctx.visitKey();
      const value = ctx.visitValue();
      const formatted = key + ': ' + value;

      return this.decorateWithComments(ctx.node, formatted);
    })

    .on('visitMapExpression', (ctx) => {
      let entriesFormatted = '';

      for (const entry of ctx.visitEntries()) {
        entriesFormatted += (entriesFormatted ? ', ' : '') + entry;
      }

      const formatted = '{' + entriesFormatted + '}';

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
          const formatted = `${operator}${separator}${ctx.visitArgument(0, undefined)}`;

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

          if (
            node.name === '*' &&
            ((isIntegerLiteral(left) && Math.abs(left.value) === 1) ||
              (isIntegerLiteral(right) && Math.abs(right.value) === 1))
          ) {
            const formatted = this.simplifyMultiplicationByOne(node);

            if (formatted) {
              return formatted;
            }
          }

          let leftFormatted = ctx.visitArgument(0);
          let rightFormatted = ctx.visitArgument(1);

          const shouldGroupLeftExpressions =
            groupLeft && (groupLeft === BinaryExpressionGroup.unknown || groupLeft < group);

          if (shouldGroupLeftExpressions) {
            leftFormatted = `(${leftFormatted})`;
          }

          const shouldGroupRightExpressions =
            groupRight && (groupRight === BinaryExpressionGroup.unknown || groupRight < group);

          if (shouldGroupRightExpressions) {
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
            if (Array.isArray(branch) || branch.type !== 'query') {
              return undefined;
            }

            return ctx.visitSubQuery(branch);
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

      for (const source of ctx.visitArguments()) {
        const needsSeparator = !!args;
        const needsComma = !commandsWithNoCommaArgSeparator.has(ctx.node.name);
        const separator = needsSeparator ? (needsComma ? ',' : '') + ' ' : '';

        args += separator + source;
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
