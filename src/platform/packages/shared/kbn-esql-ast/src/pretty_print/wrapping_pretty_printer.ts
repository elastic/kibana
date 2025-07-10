/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { BinaryExpressionGroup, binaryExpressionGroup } from '../ast/grouping';
import { isBinaryExpression } from '../ast/is';
import type { ESQLAstBaseItem, ESQLAstQueryExpression } from '../types';
import {
  CommandOptionVisitorContext,
  CommandVisitorContext,
  ExpressionVisitorContext,
  FunctionCallExpressionVisitorContext,
  ListLiteralExpressionVisitorContext,
  MapExpressionVisitorContext,
  Visitor,
} from '../visitor';
import { children, singleItems } from '../visitor/utils';
import { BasicPrettyPrinter, BasicPrettyPrinterOptions } from './basic_pretty_printer';
import { commandOptionsWithEqualsSeparator, commandsWithNoCommaArgSeparator } from './constants';
import { getPrettyPrintStats } from './helpers';
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

  /**
   * Suffix text to append to the formatted output, before single-line
   * line-breaking comments. Essentially, this is trailing punctuation, which
   * has to be printed at the very end of the line, but before any
   * line-terminating single line comment, e.g consider the comma below:
   *
   *     [
   *       1 + 1 /** comment 1 *\ /** comment 2 *\ , // comment 3
   *       3
   *     ]
   */
  suffix?: string;
}

interface Output {
  txt: string;
  lines?: number;

  /**
   * Whether the node is returned already indented. This is done, when the
   * node, for example, line braking decorations (multi-line comments), then
   * the node and its decorations are returned already indented.
   */
  indented?: boolean;
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
    query: ESQLAstQueryExpression,
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

  private printBinaryOperatorExpression(
    ctx: ExpressionVisitorContext,
    operator: string,
    inp: Input,
    operatorLeadingWhitespace = ' '
  ): Output {
    const node = ctx.node;
    const group = binaryExpressionGroup(node);
    const [left, right] = ctx.arguments();
    const groupLeft = binaryExpressionGroup(left);
    const groupRight = binaryExpressionGroup(right);
    const continueVerticalFlattening = group && inp.flattenBinExpOfType === group;
    const suffix = inp.suffix ?? '';
    const oneArgumentPerLine =
      getPrettyPrintStats(left).hasLineBreakingDecorations ||
      getPrettyPrintStats(right).hasLineBreakingDecorations;

    if (continueVerticalFlattening || oneArgumentPerLine) {
      const parent = ctx.parent?.node;
      const isLeftChild = isBinaryExpression(parent) && parent.args[0] === node;
      const leftInput: Input = {
        indent: inp.indent,
        remaining: inp.remaining,
        flattenBinExpOfType: group,
        suffix: operatorLeadingWhitespace + operator,
      };
      const rightTab = isLeftChild ? this.opts.tab : '';
      const rightIndent = inp.indent + rightTab + (oneArgumentPerLine ? this.opts.tab : '');
      const rightInput: Input = {
        indent: rightIndent,
        remaining: inp.remaining - this.opts.tab.length,
        flattenBinExpOfType: group,
        suffix,
      };
      const leftOut = ctx.visitArgument(0, leftInput);
      const rightOut = ctx.visitArgument(1, rightInput);

      let txt = leftOut.txt + '\n';

      if (!rightOut.indented) {
        txt += rightIndent;
      }

      txt += rightOut.txt;

      return { txt, indented: leftOut.indented };
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

    const length =
      leftFormatted.length +
      rightFormatted.length +
      operatorLeadingWhitespace.length +
      operator.length +
      2;
    const fitsOnOneLine = length <= inp.remaining;

    let indented = false;

    if (fitsOnOneLine) {
      txt = `${leftFormatted}${operatorLeadingWhitespace}${operator} ${rightFormatted}${suffix}`;
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
        suffix,
      };
      const leftOut = ctx.visitArgument(0, leftInput);
      const rightOut = ctx.visitArgument(1, rightInput);

      txt = `${leftOut.txt}${operatorLeadingWhitespace}${operator}\n`;

      if (!rightOut.indented) {
        txt += `${inp.indent}${this.opts.tab}`;
      }

      txt += rightOut.txt;
      indented = leftOut.indented;
    }

    return { txt, indented };
  }

  /**
   * Prints node children as a list, separated by commas. If the list is too
   * long, it will be broken into multiple lines, otherwise it will be all
   * printed on a single line.
   *
   * The breaking into two lines happens in two stages, first the list is simply
   * wrapped into multiple lines, where the wrapping happens just before the
   * list element that is too long to fit into the remaining space.
   *
   * Alternatively, if the first ("wrapping") approach results in some line
   * still exceeding the maximum line length, or if some line in the middle of
   * the list (not the last line) contains only a single element, then the list
   * is "broken" into multiple lines, where each line contains a single
   * element.
   *
   * To summarize:
   *
   * 1. First try to print the list in a single line, if it fits.
   * 2. If it doesn't fit, try to WRAP the list into multiple lines.
   * 3. If the WRAP doesn't succeed, then BREAK the list into element-per-line
   *    format.
   *
   * @param ctx The node which contains the children to be printed.
   * @param inp Expression visitor input arguments.
   * @returns Expression visitor output.
   */
  private printChildrenList(
    ctx:
      | CommandVisitorContext
      | CommandOptionVisitorContext
      | FunctionCallExpressionVisitorContext
      | ListLiteralExpressionVisitorContext
      | MapExpressionVisitorContext,
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

    for (const child of children(ctx.node)) {
      if (getPrettyPrintStats(child).hasLineBreakingDecorations) {
        oneArgumentPerLine = true;
        break;
      }
    }

    const commaBetweenArgs = !commandsWithNoCommaArgSeparator.has(ctx.node.name);

    if (!oneArgumentPerLine) {
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

        let separator = txt ? (commaBetweenArgs ? ',' : '') : '';
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
    }

    let indent = inp.indent + this.opts.tab;

    if (ctx instanceof CommandVisitorContext) {
      const isFirstCommand =
        (ctx.parent?.node as ESQLAstQueryExpression)?.commands?.[0] === ctx.node;
      if (!isFirstCommand) {
        indent += this.opts.commandTab;
      }
    }

    if (oneArgumentPerLine) {
      lines = 1;
      txt = ctx instanceof CommandVisitorContext ? '' : '\n';
      const args = [...ctx.arguments()].filter((arg) => {
        if (!arg) return false;
        if (arg.type === 'option') return arg.name === 'as';
        return true;
      });
      const length = args.length;
      const last = length - 1;
      for (let i = 0; i <= last; i++) {
        const isFirstArg = i === 0;
        const isLastArg = i === last;
        const arg = ctx.visitExpression(args[i], {
          indent,
          remaining: this.opts.wrap - indent.length,
          suffix: isLastArg ? '' : commaBetweenArgs ? ',' : '',
        });
        const separator = isFirstArg ? '' : '\n';
        const indentation = arg.indented ? '' : indent;
        txt += separator + indentation + arg.txt;
        lines++;
      }
    }

    return { txt, lines, indent, oneArgumentPerLine };
  }

  protected printTopDecorations(indent: string, node: ESQLAstBaseItem): string {
    const formatting = node.formatting;

    if (!formatting || !formatting.top || !formatting.top.length) {
      return '';
    }

    let txt = '';

    for (const decoration of formatting.top) {
      if (decoration.type === 'comment') {
        txt += indent + LeafPrinter.comment(decoration) + '\n';
      }
    }

    return txt;
  }

  protected decorateWithComments(
    { indent, suffix }: Input,
    node: ESQLAstBaseItem,
    txt: string,
    indented: boolean = false
  ): { txt: string; indented: boolean } {
    const formatting = node.formatting;

    if (!formatting) {
      return { txt: txt + (suffix ?? ''), indented };
    }

    if (formatting.left) {
      const comments = LeafPrinter.commentList(formatting.left);

      if (comments) {
        indented = true;
        txt = `${indent}${comments} ${txt}`;
      }
    }

    if (formatting.top) {
      const top = formatting.top;
      const length = top.length;

      for (let i = length - 1; i >= 0; i--) {
        const decoration = top[i];

        if (decoration.type === 'comment') {
          if (!indented) {
            txt = indent + txt;
            indented = true;
          }
          txt = indent + LeafPrinter.comment(decoration) + '\n' + txt;
          indented = true;
        }
      }
    }

    if (formatting.right) {
      const comments = LeafPrinter.commentList(formatting.right);

      if (comments) {
        txt = `${txt} ${comments}`;
      }
    }

    if (suffix) {
      txt += suffix;
    }

    if (formatting.rightSingleLine) {
      const comment = LeafPrinter.comment(formatting.rightSingleLine);

      txt += ` ${comment}`;
    }

    if (formatting.bottom) {
      for (const decoration of formatting.bottom) {
        if (decoration.type === 'comment') {
          indented = true;
          txt = txt + '\n' + indent + LeafPrinter.comment(decoration);
        }
      }
    }

    return { txt, indented };
  }

  protected readonly visitor: Visitor<any> = new Visitor()
    .on('visitExpression', (ctx, inp: Input): Output => {
      const txt = ctx.node.text ?? '<EXPRESSION>';
      return { txt };
    })

    .on('visitIdentifierExpression', (ctx, inp: Input) => {
      const formatted = LeafPrinter.identifier(ctx.node);
      const { txt, indented } = this.decorateWithComments(inp, ctx.node, formatted);

      return { txt, indented };
    })

    .on('visitSourceExpression', (ctx, inp: Input): Output => {
      const formatted = LeafPrinter.source(ctx.node);
      const { txt, indented } = this.decorateWithComments(inp, ctx.node, formatted);

      return { txt, indented };
    })

    .on('visitColumnExpression', (ctx, inp: Input): Output => {
      const formatted = LeafPrinter.column(ctx.node);
      const { txt, indented } = this.decorateWithComments(inp, ctx.node, formatted);

      return { txt, indented };
    })

    .on('visitLiteralExpression', (ctx, inp: Input): Output => {
      const formatted = LeafPrinter.literal(ctx.node);
      const { txt, indented } = this.decorateWithComments(inp, ctx.node, formatted);

      return { txt, indented };
    })

    .on('visitTimeIntervalLiteralExpression', (ctx, inp: Input): Output => {
      const formatted = LeafPrinter.timeInterval(ctx.node);
      const { txt, indented } = this.decorateWithComments(inp, ctx.node, formatted);

      return { txt, indented };
    })

    .on('visitInlineCastExpression', (ctx, inp: Input): Output => {
      const value = ctx.value();
      const wrapInBrackets =
        value.type !== 'literal' &&
        value.type !== 'column' &&
        !(value.type === 'function' && value.subtype === 'variadic-call');
      const castType = ctx.node.castType;

      const valueResult = ctx.visitValue({
        indent: inp.indent,
        remaining: inp.remaining - castType.length - 2,
      });
      let { txt: valueFormatted } = valueResult;

      if (wrapInBrackets) {
        valueFormatted = `(${valueFormatted})`;
      }

      const formatted = `${valueFormatted}::${ctx.node.castType}`;
      const { txt, indented } = this.decorateWithComments(
        inp,
        ctx.node,
        formatted,
        valueResult.indented
      );

      return { txt, indented };
    })

    .on('visitListLiteralExpression', (ctx, inp: Input): Output => {
      const args = this.printChildrenList(ctx, {
        indent: inp.indent,
        remaining: inp.remaining - 1,
      });
      const node = ctx.node;
      const isTuple = node.subtype === 'tuple';
      const leftParenthesis = isTuple ? '(' : '[';
      const rightParenthesis = isTuple ? ')' : ']';
      const rightParenthesisIndent = args.oneArgumentPerLine ? '\n' + inp.indent : '';
      const formatted = leftParenthesis + args.txt + rightParenthesisIndent + rightParenthesis;
      const { txt, indented } = this.decorateWithComments(inp, ctx.node, formatted);

      return { txt, indented };
    })

    .on('visitMapEntryExpression', (ctx, inp: Input) => {
      const operator = this.keyword(':');
      const expression = this.printBinaryOperatorExpression(ctx, operator, inp, '');

      return this.decorateWithComments(
        { ...inp, suffix: '' },
        ctx.node,
        expression.txt,
        expression.indented
      );
    })

    .on('visitMapExpression', (ctx, inp: Input) => {
      const { txt, oneArgumentPerLine } = this.printChildrenList(ctx, inp);

      let formatted = txt;

      if (oneArgumentPerLine) {
        formatted = '{' + txt + '\n' + inp.indent + '}';
      } else {
        formatted = '{' + txt + '}';
      }

      return this.decorateWithComments(inp, ctx.node, formatted);
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
          const separator = operator === '-' || operator === '+' ? '' : ' ';
          txt = `${operator}${separator}${ctx.visitArgument(0, inp).txt}`;
          break;
        }
        case 'postfix-unary-expression': {
          const suffix = inp.suffix ?? '';
          txt = `${ctx.visitArgument(0, { ...inp, suffix: '' }).txt} ${operator}${suffix}`;
          break;
        }
        case 'binary-expression': {
          return this.printBinaryOperatorExpression(ctx, operator, inp);
        }
        default: {
          const args = this.printChildrenList(ctx, {
            indent: inp.indent,
            remaining: inp.remaining - operator.length - 1,
          });

          let breakClosingParenthesis = false;

          if (getPrettyPrintStats(ctx.node).hasRightSingleLineComments) {
            breakClosingParenthesis = true;
          }

          let closingParenthesisFormatted = ')';

          if (breakClosingParenthesis) {
            closingParenthesisFormatted = '\n' + inp.indent + ')';
          }

          txt = `${operator}(${args.txt}${closingParenthesisFormatted}${inp.suffix ?? ''}`;
        }
      }

      return { txt };
    })

    .on('visitCommandOption', (ctx, inp: Input): Output => {
      const option = this.opts.lowercaseOptions ? ctx.node.name : ctx.node.name.toUpperCase();
      const args = this.printChildrenList(ctx, {
        indent: inp.indent,
        remaining: inp.remaining - option.length - 1,
      });
      const argsFormatted = args.txt ? `${args.txt[0] === '\n' ? '' : ' '}${args.txt}` : '';
      const separator = commandOptionsWithEqualsSeparator.has(ctx.node.name) ? ' =' : '';
      const txt = `${option}${separator}${argsFormatted}`;

      return { txt, lines: args.lines };
    })

    .on('visitCommand', (ctx, inp: Input): Output => {
      const opts = this.opts;
      const node = ctx.node;
      let cmd = opts.lowercaseCommands ? node.name : node.name.toUpperCase();

      if (node.commandType) {
        const type = opts.lowercaseCommands ? node.commandType : node.commandType.toUpperCase();
        cmd = `${type} ${cmd}`;
      }

      const args = this.printChildrenList(ctx, {
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

      let txt = `${cmd}${argsWithWhitespace}${optionsWithWhitespace}`;
      const formatting = node.formatting;

      if (formatting) {
        if (formatting.left) {
          const comments = LeafPrinter.commentList(formatting.left);

          if (comments) {
            txt = `${comments} ${txt}`;
          }
        }
      }

      return { txt, lines: args.lines /* add options lines count */ };
    })

    .on('visitQuery', (ctx) => {
      const opts = this.opts;
      const indent = opts.indent ?? '';
      const commands = ctx.node.commands;
      const commandCount = commands.length;

      let multiline = opts.multiline ?? commandCount > 3;

      if (!multiline) {
        const stats = getPrettyPrintStats(ctx.node);
        if (stats.hasLineBreakingDecorations) {
          multiline = true;
        }
      }

      if (!multiline) {
        const oneLine = indent + BasicPrettyPrinter.print(ctx.node, opts);
        if (oneLine.length <= opts.wrap) {
          return oneLine;
        } else {
          multiline = true;
        }
      }

      let text = indent;
      const pipedCommandIndent = `${indent}${opts.pipeTab ?? '  '}`;
      const cmdSeparator = multiline ? `${pipedCommandIndent}| ` : ' | ';
      let i = 0;
      let prevOut: Output | undefined;

      for (const out of ctx.visitCommands({ indent, remaining: opts.wrap - indent.length })) {
        const isFirstCommand = i === 0;
        const isSecondCommand = i === 1;

        if (isSecondCommand) {
          const firstCommandIsMultiline = prevOut?.lines && prevOut.lines > 1;
          if (firstCommandIsMultiline) text += '\n' + indent;
        }

        const commandIndent = isFirstCommand ? indent : pipedCommandIndent;
        const topDecorations = this.printTopDecorations(commandIndent, commands[i]);

        if (topDecorations) {
          if (!isFirstCommand) {
            text += '\n';
          }
          text += topDecorations;
        }

        if (!isFirstCommand) {
          if (multiline && !topDecorations) {
            text += '\n';
          }
          text += cmdSeparator;
        }

        text += out.txt;
        i++;
        prevOut = out;
      }

      return text;
    });

  public print(query: ESQLAstQueryExpression) {
    return this.visitor.visitQuery(query, undefined);
  }
}
