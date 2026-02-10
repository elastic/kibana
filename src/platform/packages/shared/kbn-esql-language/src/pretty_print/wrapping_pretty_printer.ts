/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { BinaryExpressionGroup } from '../ast/grouping';
import { binaryExpressionGroup, unaryExpressionGroup } from '../ast/grouping';
import { isBinaryExpression, isIdentifier, isParamLiteral } from '../ast/is';
import type { ESQLAstBaseItem, ESQLAstQueryExpression, ESQLMap } from '../types';
import type {
  CommandOptionVisitorContext,
  ExpressionVisitorContext,
  FunctionCallExpressionVisitorContext,
  ListLiteralExpressionVisitorContext,
  MapExpressionVisitorContext,
} from '../ast/visitor';
import { CommandVisitorContext, Visitor } from '../ast/visitor';
import { children, singleItems } from '../ast/visitor/utils';
import type { BasicPrettyPrinterOptions } from './basic_pretty_printer';
import { BasicPrettyPrinter } from './basic_pretty_printer';
import {
  commandOptionsWithEqualsSeparator,
  commandsWithNoCommaArgSeparator,
  commandsWithSpecialCommaRules,
} from './constants';
import { getPrettyPrintStats } from './helpers';
import { LeafPrinter } from './leaf_printer';

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

  protected readonly opts: Omit<Required<WrappingPrettyPrinterOptions>, 'mapRepresentation'> &
    Pick<WrappingPrettyPrinterOptions, 'mapRepresentation'>;

  constructor(opts: WrappingPrettyPrinterOptions = {}) {
    this.opts = {
      indent: opts.indent ?? '',
      tab: opts.tab ?? '  ',
      pipeTab: opts.pipeTab ?? '  ',
      skipHeader: opts.skipHeader ?? false,
      commandTab: opts.commandTab ?? '    ',
      multiline: opts.multiline ?? false,
      wrap: opts.wrap ?? 80,
      lowercase: opts.lowercase ?? false,
      lowercaseCommands: opts.lowercaseCommands ?? opts.lowercase ?? false,
      lowercaseOptions: opts.lowercaseOptions ?? opts.lowercase ?? false,
      lowercaseFunctions: opts.lowercaseFunctions ?? opts.lowercase ?? false,
      lowercaseKeywords: opts.lowercaseKeywords ?? opts.lowercase ?? false,
      mapRepresentation: opts.mapRepresentation,
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
    const doGroupLeft = groupLeft && groupLeft < group;
    const doGroupRight = groupRight && groupRight < group;
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

    if (doGroupLeft) {
      leftFormatted = `(${leftFormatted})`;
    }

    if (doGroupRight) {
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

      if (doGroupLeft) {
        leftOut.txt = `(${leftOut.txt})`;
      }

      if (doGroupRight) {
        rightOut.txt = `(${rightOut.txt})`;
      }

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
    inp: Input,
    doNotUseCommaAsSeparator: boolean = false
  ) {
    let txt = '';
    let lines = 1;
    let largestArg = 0;
    let argsPerLine = 0;
    let minArgsPerLine = 1e6;
    let maxArgsPerLine = 0;
    let remainingCurrentLine = inp.remaining;
    let oneArgumentPerLine = false;

    if (ctx.node.name === 'fork') {
      oneArgumentPerLine = true;
    }

    for (const child of children(ctx.node)) {
      if (getPrettyPrintStats(child).hasLineBreakingDecorations) {
        oneArgumentPerLine = true;
        break;
      }
    }

    let commaBetweenArgs = !commandsWithNoCommaArgSeparator.has(ctx.node.name);

    if (doNotUseCommaAsSeparator) commaBetweenArgs = false;

    if (!oneArgumentPerLine) {
      let argIndex = 0;
      const opts: BasicPrettyPrinterOptions = {
        ...this.opts,
        mapRepresentation: ctx.node.type === 'map' ? ctx.node.representation : undefined,
      };

      ARGS: for (const arg of singleItems(ctx.arguments())) {
        if (arg.type === 'option') {
          continue;
        }

        const formattedArg = BasicPrettyPrinter.expression(arg, opts);
        const formattedArgLength = formattedArg.length;
        const needsWrap = remainingCurrentLine < formattedArgLength;
        if (formattedArgLength > largestArg) {
          largestArg = formattedArgLength;
        }

        // Check if this command has special comma rules
        const specialRule = commandsWithSpecialCommaRules.get(ctx.node.name);
        const needsComma = specialRule ? specialRule(argIndex) : commaBetweenArgs;
        let separator = txt ? (needsComma ? ',' : ' ') : '';

        argIndex++;

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
          fragment = separator + (needsComma && separator ? ' ' : '') + formattedArg;
          remainingCurrentLine -= fragment.length;
        }
        txt += fragment;
      }
    }

    const isAssignmentMap = ctx.node.type === 'map' && ctx.node.representation === 'assignment';
    const isBareList = ctx.node.type === 'list' && ctx.node.subtype === 'bare';

    if (isAssignmentMap && lines > 1) {
      oneArgumentPerLine = true;
    }

    // For bare lists, don't add extra indentation since there's no opening bracket
    let indent = isBareList ? inp.indent : inp.indent + this.opts.tab;

    if (ctx instanceof CommandVisitorContext) {
      const isFirstCommand =
        (ctx.parent?.node as ESQLAstQueryExpression)?.commands?.[0] === ctx.node;
      if (!isFirstCommand) {
        indent += this.opts.commandTab;
      }
    }

    if (oneArgumentPerLine) {
      lines = 1;
      txt = ctx instanceof CommandVisitorContext || isAssignmentMap || isBareList ? '' : '\n';
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
        const specialRule = commandsWithSpecialCommaRules.get(ctx.node.name);
        const needsComma = specialRule ? specialRule(i) : commaBetweenArgs;
        const arg = ctx.visitExpression(args[i], {
          indent,
          remaining: this.opts.wrap - indent.length,
          suffix: isLastArg ? '' : needsComma ? ',' : '',
        });
        const indentation = arg.indented ? '' : indent;
        const formattedArg = arg.txt;
        const separator = isFirstArg ? '' : '\n';

        // Remove extra indentation for PROMQL command first map argument
        let adjustedIndentation = indentation;
        if (
          i === 0 &&
          ctx instanceof CommandVisitorContext &&
          ctx.name() === 'PROMQL' &&
          [...children(ctx.node)][0].type === 'map'
        ) {
          adjustedIndentation = adjustedIndentation.slice(0, -2);
        }

        // For bare lists, the first argument should not have indentation since
        // there's no opening bracket and it continues on the same line
        if (isBareList && isFirstArg) {
          adjustedIndentation = '';
        }

        txt += separator + adjustedIndentation + formattedArg;
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
      let text = ctx.node.text ?? '<EXPRESSION>';

      if (text) {
        // TODO: this will be replaced by proper PromQL pretty-printing in subsequent PR
        text = text.replace(/<EOF>/g, '').trim();
      }

      // TODO: decorate with comments
      return { txt: text };
    })

    .on('visitHeaderCommand', (ctx, inp: Input): Output => {
      const opts = this.opts;
      const cmd = opts.lowercaseCommands ? ctx.node.name : ctx.node.name.toUpperCase();

      let args = '';

      for (const arg of ctx.visitArgs(inp)) {
        args += (args ? ', ' : '') + arg.txt;
      }

      const argsFormatted = args ? ` ${args}` : '';
      const formatted = `${cmd}${argsFormatted};`;

      const formatting = ctx.node.formatting;
      let txt = formatted;
      let indented = false;

      if (formatting) {
        if (formatting.left) {
          const comments = LeafPrinter.commentList(formatting.left);
          if (comments) {
            indented = true;
            txt = `${inp.indent}${comments} ${txt}`;
          }
        }

        if (formatting.top) {
          const top = formatting.top;
          const length = top.length;
          for (let i = length - 1; i >= 0; i--) {
            const decoration = top[i];
            if (decoration.type === 'comment') {
              if (!indented) {
                txt = inp.indent + txt;
                indented = true;
              }
              txt = inp.indent + LeafPrinter.comment(decoration) + '\n' + txt;
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

        // For header commands, rightSingleLine comments should appear on the same line
        // but we need to ensure there's a newline after the comment for the next statement
        if (formatting.rightSingleLine) {
          const comment = LeafPrinter.comment(formatting.rightSingleLine);
          txt = `${txt} ${comment}`;
        }

        if (formatting.bottom) {
          for (const decoration of formatting.bottom) {
            if (decoration.type === 'comment') {
              indented = true;
              txt = txt + '\n' + inp.indent + LeafPrinter.comment(decoration);
            }
          }
        }
      }

      return { txt, indented };
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
      const subtype = node.subtype;
      const isBare = subtype === 'bare';
      const isTuple = subtype === 'tuple';
      const leftParenthesis = isBare ? '' : isTuple ? '(' : '[';
      const rightParenthesis = isBare ? '' : isTuple ? ')' : ']';
      const rightParenthesisIndent = !isBare && args.oneArgumentPerLine ? '\n' + inp.indent : '';
      const formatted = leftParenthesis + args.txt + rightParenthesisIndent + rightParenthesis;
      const { txt, indented } = this.decorateWithComments(inp, ctx.node, formatted);

      return { txt, indented };
    })

    .on('visitMapEntryExpression', (ctx, inp: Input) => {
      const representation = (ctx.parent?.node as ESQLMap).representation ?? 'map';
      const operator = representation === 'map' ? ':' : representation === 'assignment' ? '=' : '';
      const operatorLeadingWhitespace = representation === 'assignment' ? ' ' : '';
      const expression = this.printBinaryOperatorExpression(
        ctx,
        operator,
        inp,
        operatorLeadingWhitespace
      );

      return this.decorateWithComments(
        { ...inp, suffix: '' },
        ctx.node,
        expression.txt,
        expression.indented
      );
    })

    .on('visitMapExpression', (ctx, inp: Input) => {
      const representation = ctx.node.representation ?? 'map';
      const doNotUseCommaAsSeparator = representation !== 'map';
      const { txt, oneArgumentPerLine } = this.printChildrenList(
        ctx,
        inp,
        doNotUseCommaAsSeparator
      );

      let formatted = txt;

      if (representation === 'map') {
        if (oneArgumentPerLine) {
          formatted = '{' + txt + '\n' + inp.indent + '}';
        } else {
          formatted = '{' + txt + '}';
        }
      } else if (representation === 'assignment') {
        // Add initial indentation for assignment maps (bare maps)
        // Only when not in oneArgumentPerLine mode, as that already handles indentation
        if (!oneArgumentPerLine) {
          formatted = this.opts.tab + txt;
        }
      }

      return this.decorateWithComments(inp, ctx.node, formatted);
    })

    .on('visitParensExpression', (ctx, inp: Input): Output => {
      // Check if parent is FORK command
      const parent = ctx.parent?.node;
      const isForkBranch =
        !Array.isArray(parent) &&
        parent?.type === 'command' &&
        parent.name === 'fork' &&
        ctx.node.child?.type === 'query';

      let formatted: string;
      if (isForkBranch) {
        const baseIndent = inp.indent + this.opts.tab;
        const childText = this.visitor.visitQuery(ctx.node.child as ESQLAstQueryExpression, {
          indent: baseIndent,
          remaining: this.opts.wrap - baseIndent.length,
        });

        const lines = childText.txt.split('\n');

        for (let i = 0; i < lines.length; i++) {
          if (i === 0) {
            lines[i] = '  ' + lines[i];
          } else if (lines[i].startsWith('  ')) {
            lines[i] = lines[i].slice(2);
          }
        }

        formatted = `(\n${lines.join('\n')}\n${inp.indent})`;
      } else {
        const child = ctx.visitChild(inp);
        formatted = `(${child.txt.trimStart()})`;
      }

      return this.decorateWithComments(inp, ctx.node, formatted);
    })

    .on('visitFunctionCallExpression', (ctx, inp: Input): Output => {
      const node = ctx.node;
      let operator = ctx.operator();
      let txt: string = '';

      // Check if function name is a parameter stored in node.operator
      if (ctx.node.operator && isParamLiteral(ctx.node.operator)) {
        operator = LeafPrinter.param(ctx.node.operator);
      } else {
        if (ctx.node.operator && isIdentifier(ctx.node.operator)) {
          operator = ctx.node.operator.name;
        }
        operator =
          this.opts.lowercaseFunctions ?? this.opts.lowercase
            ? operator.toLowerCase()
            : operator.toUpperCase();
      }

      switch (node.subtype) {
        case 'unary-expression': {
          operator = this.keyword(operator);

          const separator = operator === '-' || operator === '+' ? '' : ' ';
          const argument = ctx.arguments()[0];
          const argumentFormatted = ctx.visitArgument(0, inp);

          const operatorPrecedence = unaryExpressionGroup(ctx.node);
          const argumentPrecedence = binaryExpressionGroup(argument);

          if (
            argumentPrecedence !== BinaryExpressionGroup.none &&
            argumentPrecedence < operatorPrecedence
          ) {
            argumentFormatted.txt = `(${argumentFormatted.txt})`;
          }

          txt = `${operator}${separator}${argumentFormatted.txt}`;
          break;
        }
        case 'postfix-unary-expression': {
          operator = this.keyword(operator);

          const suffix = inp.suffix ?? '';
          txt = `${ctx.visitArgument(0, { ...inp, suffix: '' }).txt} ${operator}${suffix}`;
          break;
        }
        case 'binary-expression': {
          operator = this.keyword(operator);

          return this.printBinaryOperatorExpression(ctx, operator, inp);
        }
        default: {
          const args = this.printChildrenList(ctx, {
            indent: inp.indent,
            remaining: inp.remaining - operator.length - 1,
          });

          let breakClosingParenthesis = false;

          if (getPrettyPrintStats(ctx.node.args).hasRightSingleLineComments) {
            breakClosingParenthesis = true;
          }

          let closingParenthesisFormatted = ')';

          if (breakClosingParenthesis) {
            closingParenthesisFormatted = '\n' + inp.indent + ')';
          }

          txt = `${operator}(${args.txt}${closingParenthesisFormatted}${inp.suffix ?? ''}`;
        }
      }

      return this.decorateWithComments({ ...inp, suffix: '' }, ctx.node, txt);
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

      // TODO: decorate with comments

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

    .on('visitQuery', (ctx, inp: Input): Output => {
      const opts = this.opts;
      const indent = inp?.indent ?? opts.indent ?? '';
      const remaining = inp?.remaining ?? opts.wrap;
      const commands = ctx.node.commands;
      const commandCount = commands.length;
      const hasHeaderCommands = !opts.skipHeader && ctx.node.header && ctx.node.header.length > 0;

      let multiline = opts.multiline ?? commandCount > 3;

      if (!multiline) {
        const stats = getPrettyPrintStats(ctx.node);
        if (stats.hasLineBreakingDecorations) {
          multiline = true;
        }
      }

      if (!multiline && !hasHeaderCommands) {
        const oneLine = indent + BasicPrettyPrinter.print(ctx.node, opts);
        if (oneLine.length <= remaining) {
          return { txt: oneLine };
        } else {
          multiline = true;
        }
      }

      // Special handling for queries with header commands: we want to try
      // to keep the main query on a single line if possible.
      if (hasHeaderCommands && !multiline && commandCount < 4) {
        // Use skipHeader option to format just the main query
        const mainQueryOneLine = BasicPrettyPrinter.print(ctx.node, {
          ...opts,
          skipHeader: true,
        });

        if (mainQueryOneLine.length <= remaining) {
          // Main query fits on one line, print headers separately then main query
          let text = indent;
          let hasHeaderCommandsOutput = false;

          for (const headerOut of ctx.visitHeaderCommands({
            indent,
            remaining: remaining - indent.length,
          })) {
            if (hasHeaderCommandsOutput) {
              text += '\n' + indent;
            }
            text += headerOut.txt;
            hasHeaderCommandsOutput = true;
          }

          if (hasHeaderCommandsOutput) {
            text += '\n' + indent;
          }

          text += mainQueryOneLine;
          return { txt: text };
        } else {
          // Main query doesn't fit, use multiline formatting
          multiline = true;
        }
      }

      // Regular top-level query formatting
      let text = indent;
      const pipedCommandIndent = `${indent}${opts.pipeTab ?? '  '}`;
      const cmdSeparator = multiline ? `${pipedCommandIndent}| ` : ' | ';

      // Print header pseudo-commands first (e.g., SET instructions).
      // Each header command goes on its own line.
      let hasHeaderCommandsOutput = false;

      if (hasHeaderCommands) {
        for (const headerOut of ctx.visitHeaderCommands({
          indent,
          remaining: remaining - indent.length,
        })) {
          if (hasHeaderCommandsOutput) {
            text += '\n' + indent;
          }
          text += headerOut.txt;
          hasHeaderCommandsOutput = true;
        }
      }

      let i = 0;
      let hasCommands = false;

      for (const out of ctx.visitCommands({ indent, remaining: remaining - indent.length })) {
        const isFirstCommand = i === 0;

        const commandIndent = isFirstCommand ? indent : pipedCommandIndent;
        const topDecorations = this.printTopDecorations(commandIndent, commands[i]);

        if (topDecorations) {
          if (!isFirstCommand) {
            text += '\n';
          }
          text += topDecorations;
        }

        if (hasCommands) {
          // Separate main commands with pipe `|`
          if (multiline && !topDecorations) {
            text += '\n';
          }
          text += cmdSeparator;
        } else if (hasHeaderCommandsOutput) {
          // Separate header commands from main commands with a newline
          text += '\n' + indent;
        }

        text += out.txt;
        i++;
        hasCommands = true;
      }

      return { txt: text };
    });

  public print(query: ESQLAstQueryExpression) {
    return this.visitor.visitQuery(query, undefined).txt;
  }
}
