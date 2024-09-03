/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { BinaryExpressionGroup } from '../ast/constants';
import { binaryExpressionGroup, isBinaryExpression } from '../ast/helpers';
import {
  CommandOptionVisitorContext,
  CommandVisitorContext,
  ESQLAstQueryNode,
  ExpressionVisitorContext,
  FunctionCallExpressionVisitorContext,
  Visitor,
} from '../visitor';
import { singleItems } from '../visitor/utils';
import { BasicPrettyPrinter, BasicPrettyPrinterOptions } from './basic_pretty_printer';
import { LeafPrinter } from './leaf_printer';

/**
 * @todo
 *
 * 1. Implement list literal pretty printing.
 */

interface Input {
  indent: string;
  remaining: number;

  /**
   * Passed between adjacent binary expressions to flatten them into a single
   * vertical list.
   *
   * For example, a list like this:
   *
   * ```
   * 1 + 2 + 3 + 4
   * ```
   *
   * Is flatted into a single list:
   *
   * ```
   * 1 +
   *   2 +
   *   3 +
   *   4
   * ```
   */
  flattenBinExpOfType?: BinaryExpressionGroup;
}

interface Output {
  txt: string;
  lines?: number;
}

export interface WrappingPrettyPrinterOptions extends BasicPrettyPrinterOptions {
  /**
   * Initial indentation string inserted before the whole query. Defaults to an
   * empty string.
   */
  indent?: string;

  /**
   * Tabbing string inserted before new level of nesting. Defaults to two spaces.
   */
  tab?: string;

  /**
   * Tabbing string inserted before a pipe, when `multiline` is `true`.
   */
  pipeTab?: string;

  /**
   * Tabbing string inserted before command arguments, when they are broken into
   * multiple lines. Defaults to four spaces.
   */
  commandTab?: string;

  /**
   * Whether to force multiline formatting. Defaults to `false`. If set to
   * `false`, it will try to fit the query into a single line.
   */
  multiline?: boolean;

  /**
   * Expected width of the output. Defaults to 80 characters. Text will be
   * wrapped to fit this width.
   */
  wrap?: number;
}

export class WrappingPrettyPrinter {
  public static readonly print = (
    query: ESQLAstQueryNode,
    opts?: WrappingPrettyPrinterOptions
  ): string => {
    const printer = new WrappingPrettyPrinter(opts);
    return printer.print(query);
  };

  protected readonly opts: Required<WrappingPrettyPrinterOptions>;

  constructor(opts: WrappingPrettyPrinterOptions = {}) {
    this.opts = {
      indent: opts.indent ?? '',
      tab: opts.tab ?? '  ',
      pipeTab: opts.pipeTab ?? '  ',
      commandTab: opts.commandTab ?? '    ',
      multiline: opts.multiline ?? false,
      wrap: opts.wrap ?? 80,
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

  private visitBinaryExpression(
    ctx: ExpressionVisitorContext,
    operator: string,
    inp: Input
  ): Output {
    const node = ctx.node;
    const group = binaryExpressionGroup(node);
    const [left, right] = ctx.arguments();
    const groupLeft = binaryExpressionGroup(left);
    const groupRight = binaryExpressionGroup(right);
    const continueVerticalFlattening = group && inp.flattenBinExpOfType === group;

    if (continueVerticalFlattening) {
      const parent = ctx.parent?.node;
      const isLeftChild = isBinaryExpression(parent) && parent.args[0] === node;
      const leftInput: Input = {
        indent: inp.indent,
        remaining: inp.remaining,
        flattenBinExpOfType: group,
      };
      const rightInput: Input = {
        indent: inp.indent + this.opts.tab,
        remaining: inp.remaining - this.opts.tab.length,
        flattenBinExpOfType: group,
      };
      const leftOut = ctx.visitArgument(0, leftInput);
      const rightOut = ctx.visitArgument(1, rightInput);
      const rightTab = isLeftChild ? this.opts.tab : '';
      const txt = `${leftOut.txt} ${operator}\n${inp.indent}${rightTab}${rightOut.txt}`;

      return { txt };
    }

    let txt: string = '';
    let leftFormatted = BasicPrettyPrinter.expression(left, this.opts);
    let rightFormatted = BasicPrettyPrinter.expression(right, this.opts);

    if (groupLeft && groupLeft < group) {
      leftFormatted = `(${leftFormatted})`;
    }

    if (groupRight && groupRight < group) {
      rightFormatted = `(${rightFormatted})`;
    }

    const length = leftFormatted.length + rightFormatted.length + operator.length + 2;
    const fitsOnOneLine = length <= inp.remaining;

    if (fitsOnOneLine) {
      txt = `${leftFormatted} ${operator} ${rightFormatted}`;
    } else {
      const flattenVertically = group === groupLeft || group === groupRight;
      const flattenBinExpOfType = flattenVertically ? group : undefined;
      const leftInput: Input = {
        indent: inp.indent,
        remaining: inp.remaining,
        flattenBinExpOfType,
      };
      const rightInput: Input = {
        indent: inp.indent + this.opts.tab,
        remaining: inp.remaining - this.opts.tab.length,
        flattenBinExpOfType,
      };
      const leftOut = ctx.visitArgument(0, leftInput);
      const rightOut = ctx.visitArgument(1, rightInput);

      txt = `${leftOut.txt} ${operator}\n${inp.indent}${this.opts.tab}${rightOut.txt}`;
    }

    return { txt };
  }

  private printArguments(
    ctx: CommandVisitorContext | CommandOptionVisitorContext | FunctionCallExpressionVisitorContext,
    inp: Input
  ) {
    let txt = '';
    let lines = 1;
    let largestArg = 0;
    let argsPerLine = 0;
    let minArgsPerLine = 1e6;
    let maxArgsPerLine = 0;
    let remainingCurrentLine = inp.remaining;
    let oneArgumentPerLine = false;

    ARGS: for (const arg of singleItems(ctx.arguments())) {
      if (arg.type === 'option') {
        continue;
      }

      const formattedArg = BasicPrettyPrinter.expression(arg, this.opts);
      const formattedArgLength = formattedArg.length;
      const needsWrap = remainingCurrentLine < formattedArgLength;
      if (formattedArgLength > largestArg) {
        largestArg = formattedArgLength;
      }
      let separator = txt ? ',' : '';
      let fragment = '';

      if (needsWrap) {
        separator +=
          '\n' +
          inp.indent +
          this.opts.tab +
          (ctx instanceof CommandVisitorContext ? this.opts.commandTab : '');
        fragment = separator + formattedArg;
        lines++;
        if (argsPerLine > maxArgsPerLine) {
          maxArgsPerLine = argsPerLine;
        }
        if (argsPerLine < minArgsPerLine) {
          minArgsPerLine = argsPerLine;
          if (minArgsPerLine < 2) {
            oneArgumentPerLine = true;
            break ARGS;
          }
        }
        remainingCurrentLine =
          inp.remaining - formattedArgLength - this.opts.tab.length - this.opts.commandTab.length;
        argsPerLine = 1;
      } else {
        argsPerLine++;
        fragment = separator + (separator ? ' ' : '') + formattedArg;
        remainingCurrentLine -= fragment.length;
      }
      txt += fragment;
    }

    let indent = inp.indent + this.opts.tab;

    if (ctx instanceof CommandVisitorContext) {
      const isFirstCommand = (ctx.parent?.node as ESQLAstQueryNode)?.[0] === ctx.node;
      if (!isFirstCommand) {
        indent += this.opts.commandTab;
      }
    }

    if (oneArgumentPerLine) {
      lines = 1;
      txt = ctx instanceof CommandVisitorContext ? indent : '\n' + indent;
      let i = 0;
      for (const arg of ctx.visitArguments({
        indent,
        remaining: this.opts.wrap - indent.length,
      })) {
        const isFirstArg = i === 0;
        const separator = isFirstArg ? '' : ',\n' + indent;
        txt += separator + arg.txt;
        lines++;
        i++;
      }
    }

    return { txt, lines, indent, oneArgumentPerLine };
  }

  protected readonly visitor = new Visitor()
    .on('visitExpression', (ctx, inp: Input): Output => {
      const txt = ctx.node.text ?? '<EXPRESSION>';
      return { txt };
    })

    .on(
      'visitSourceExpression',
      (ctx, inp: Input): Output => ({ txt: LeafPrinter.source(ctx.node) })
    )

    .on(
      'visitColumnExpression',
      (ctx, inp: Input): Output => ({ txt: LeafPrinter.column(ctx.node) })
    )

    .on(
      'visitLiteralExpression',
      (ctx, inp: Input): Output => ({ txt: LeafPrinter.literal(ctx.node) })
    )

    .on(
      'visitTimeIntervalLiteralExpression',
      (ctx, inp: Input): Output => ({ txt: LeafPrinter.timeInterval(ctx.node) })
    )

    .on('visitInlineCastExpression', (ctx, inp: Input): Output => {
      const value = ctx.value();
      const wrapInBrackets =
        value.type !== 'literal' &&
        value.type !== 'column' &&
        !(value.type === 'function' && value.subtype === 'variadic-call');
      const castType = ctx.node.castType;

      let valueFormatted = ctx.visitValue({
        indent: inp.indent,
        remaining: inp.remaining - castType.length - 2,
      }).txt;

      if (wrapInBrackets) {
        valueFormatted = `(${valueFormatted})`;
      }

      const txt = `${valueFormatted}::${ctx.node.castType}`;

      return { txt };
    })

    .on('visitRenameExpression', (ctx, inp: Input): Output => {
      const operator = this.keyword('AS');

      return this.visitBinaryExpression(ctx, operator, inp);
    })

    .on('visitListLiteralExpression', (ctx, inp: Input): Output => {
      let elements = '';

      for (const out of ctx.visitElements()) {
        elements += (elements ? ', ' : '') + out.txt;
      }

      const txt = `[${elements}]`;
      return { txt };
    })

    .on('visitFunctionCallExpression', (ctx, inp: Input): Output => {
      const node = ctx.node;
      let operator = ctx.operator();
      let txt: string = '';

      if (this.opts.lowercaseFunctions ?? this.opts.lowercase) {
        operator = operator.toLowerCase();
      }

      switch (node.subtype) {
        case 'unary-expression': {
          txt = `${operator} ${ctx.visitArgument(0, inp).txt}`;
          break;
        }
        case 'postfix-unary-expression': {
          txt = `${ctx.visitArgument(0, inp).txt} ${operator}`;
          break;
        }
        case 'binary-expression': {
          return this.visitBinaryExpression(ctx, operator, inp);
        }
        default: {
          const args = this.printArguments(ctx, {
            indent: inp.indent,
            remaining: inp.remaining - operator.length - 1,
          });

          txt = `${operator}(${args.txt})`;
        }
      }

      return { txt };
    })

    .on('visitCommandOption', (ctx, inp: Input): Output => {
      const option = this.opts.lowercaseOptions ? ctx.node.name : ctx.node.name.toUpperCase();
      const args = this.printArguments(ctx, {
        indent: inp.indent,
        remaining: inp.remaining - option.length - 1,
      });
      const argsFormatted = args.txt ? ` ${args.txt}` : '';
      const txt = `${option}${argsFormatted}`;

      return { txt, lines: args.lines };
    })

    .on('visitCommand', (ctx, inp: Input): Output => {
      const opts = this.opts;
      const cmd = opts.lowercaseCommands ? ctx.node.name : ctx.node.name.toUpperCase();
      const args = this.printArguments(ctx, {
        indent: inp.indent,
        remaining: inp.remaining - cmd.length - 1,
      });
      const optionIndent = args.indent + opts.pipeTab;
      const optionsTxt: string[] = [];

      let options = '';
      let optionsLines = 0;
      let breakOptions = false;

      for (const out of ctx.visitOptions({
        indent: optionIndent,
        remaining: opts.wrap - optionIndent.length,
      })) {
        optionsLines += out.lines ?? 1;
        optionsTxt.push(out.txt);
        options += (options ? ' ' : '') + out.txt;
      }

      breakOptions =
        breakOptions ||
        args.lines > 1 ||
        optionsLines > 1 ||
        options.length > opts.wrap - inp.remaining - cmd.length - 1 - args.txt.length;

      if (breakOptions) {
        options = optionsTxt.join('\n' + optionIndent);
      }

      const argsWithWhitespace = args.txt
        ? `${args.oneArgumentPerLine ? '\n' : ' '}${args.txt}`
        : '';
      const optionsWithWhitespace = options
        ? `${breakOptions ? '\n' + optionIndent : ' '}${options}`
        : '';
      const txt = `${cmd}${argsWithWhitespace}${optionsWithWhitespace}`;

      return { txt, lines: args.lines /* add options lines count */ };
    })

    .on('visitQuery', (ctx) => {
      const opts = this.opts;
      const indent = opts.indent ?? '';
      const commandCount = ctx.node.length;
      let multiline = opts.multiline ?? commandCount > 3;

      if (!multiline) {
        const oneLine = indent + BasicPrettyPrinter.print(ctx.node, opts);
        if (oneLine.length <= opts.wrap) {
          return oneLine;
        } else {
          multiline = true;
        }
      }

      let text = indent;
      const cmdSeparator = multiline ? `\n${indent}${opts.pipeTab ?? '  '}| ` : ' | ';
      let i = 0;
      let prevOut: Output | undefined;

      for (const out of ctx.visitCommands({ indent, remaining: opts.wrap - indent.length })) {
        const isSecondCommand = i === 1;
        if (isSecondCommand) {
          const firstCommandIsMultiline = prevOut?.lines && prevOut.lines > 1;
          if (firstCommandIsMultiline) text += '\n' + indent;
        }
        const isFirstCommand = i === 0;
        if (!isFirstCommand) text += cmdSeparator;
        text += out.txt;
        i++;
        prevOut = out;
      }

      return text;
    });

  public print(query: ESQLAstQueryNode) {
    return this.visitor.visitQuery(query);
  }
}
