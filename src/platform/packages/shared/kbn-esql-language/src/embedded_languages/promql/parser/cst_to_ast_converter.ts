/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type * as antlr from 'antlr4';
import * as cst from '../../../parser/antlr/promql_parser';
import { getPosition } from '../../../parser/core/tokens';
import { PromQLBuilder } from '../ast/builder';
import type { AstNodeParserFields } from '../../../ast/builder/types';
import type * as ast from '../types';
import type { PromQLParser } from './parser';

// TODO: Handle `SubqueryResolutionContext`, `NonReservedContext`

/**
 * Transforms an ANTLR PromQL Concrete Syntax Tree (CST) into a
 * Kibana Abstract Syntax Tree (AST).
 */
export class PromQLCstToAstConverter {
  /**
   * Character offset to add to all location values.
   */
  private readonly offset: number;

  constructor(protected readonly parser: PromQLParser) {
    this.offset = parser.options.offset ?? 0;
  }

  // -------------------------------------------------------------------- utils

  private getParserFields(ctx: antlr.ParserRuleContext): AstNodeParserFields {
    const location = getPosition(ctx.start, ctx.stop);
    return {
      text: ctx.getText(),
      location: {
        min: location.min + this.offset,
        max: location.max + this.offset,
      },
      incomplete: Boolean(ctx.exception),
    };
  }

  private createParserFieldsFromToken(
    token: antlr.Token,
    text: string = token.text
  ): AstNodeParserFields {
    const location = getPosition(token, token);
    return {
      text,
      location: {
        min: location.min + this.offset,
        max: location.max + this.offset,
      },
      incomplete: false,
    };
  }

  private fromParserRuleToUnknown(ctx: antlr.ParserRuleContext): ast.PromQLUnknownItem {
    const location = getPosition(ctx.start, ctx.stop);
    return PromQLBuilder.unknown({
      text: ctx.getText(),
      location: {
        min: location.min + this.offset,
        max: location.max + this.offset,
      },
      incomplete: Boolean(ctx.exception),
    });
  }

  // -------------------------------------------------------------------- query

  public fromSingleStatement(
    ctx: cst.SingleStatementContext
  ): ast.PromQLAstQueryExpression | undefined {
    if (!ctx) return undefined;

    const exprCtx = ctx.expression();
    const expression = exprCtx ? this.fromExpression(exprCtx) : undefined;
    const node = PromQLBuilder.expression.query(expression, this.getParserFields(ctx));

    if (expression?.incomplete) {
      node.incomplete = true;
    }

    return node;
  }

  // --------------------------------------------------------------- expression

  public fromExpression(ctx: cst.ExpressionContext): ast.PromQLAstExpression | undefined {
    if (!ctx) return undefined;

    // ArithmeticUnary: unary +/- expression
    if (ctx instanceof cst.ArithmeticUnaryContext) {
      return this.fromArithmeticUnary(ctx);
    }

    // ValueExpression: function, selector, or constant
    if (ctx instanceof cst.ValueExpressionContext) {
      return this.fromValueExpression(ctx);
    }

    // Parenthesized: (expression)
    if (ctx instanceof cst.ParenthesizedContext) {
      return this.fromParenthesized(ctx);
    }

    // ArithmeticBinary: binary expressions
    if (ctx instanceof cst.ArithmeticBinaryContext) {
      return this.fromArithmeticBinary(ctx);
    }

    // Subquery: expression[range:resolution]
    if (ctx instanceof cst.SubqueryContext) {
      return this.fromSubquery(ctx);
    }

    // Fallback: return unknown
    return this.fromParserRuleToUnknown(ctx);
  }

  // -------------------------------------------------------------------- unary

  private fromArithmeticUnary(ctx: cst.ArithmeticUnaryContext): ast.PromQLAstExpression {
    const operatorToken = ctx._operator;
    const operator = operatorToken?.text as '+' | '-';
    const argCtx = ctx.expression();
    const arg = argCtx ? this.fromExpression(argCtx) : undefined;

    if (!arg) {
      return this.fromParserRuleToUnknown(ctx);
    }

    const node = PromQLBuilder.expression.unary(operator, arg, this.getParserFields(ctx));

    if (arg.incomplete) {
      node.incomplete = true;
    }

    return node;
  }

  // -------------------------------------------------------------------- value

  private fromValueExpression(
    ctx: cst.ValueExpressionContext
  ): ast.PromQLAstExpression | undefined {
    const valueCtx = ctx.value();
    if (!valueCtx) return undefined;

    return this.fromValue(valueCtx);
  }

  private fromValue(ctx: cst.ValueContext): ast.PromQLAstExpression | undefined {
    const funcCtx = ctx.function_();
    if (funcCtx) {
      return this.fromFunction(funcCtx);
    }

    const selectorCtx = ctx.selector();
    if (selectorCtx) {
      return this.fromSelector(selectorCtx);
    }

    const constantCtx = ctx.constant();
    if (constantCtx) {
      return this.fromConstant(constantCtx);
    }

    return undefined;
  }

  // ----------------------------------------------------------------- function

  private fromFunction(ctx: cst.FunctionContext): ast.PromQLAstExpression {
    const identToken = ctx.IDENTIFIER();
    const name = identToken?.getText() ?? '';

    const paramsCtx = ctx.functionParams();
    const args: ast.PromQLAstExpression[] = [];

    if (paramsCtx) {
      const exprCtxs = paramsCtx.expression_list();

      for (const exprCtx of exprCtxs) {
        const expr = this.fromExpression(exprCtx);

        if (expr) {
          args.push(expr);
        }
      }
    }

    const groupingCtx = ctx.grouping();
    const grouping = groupingCtx ? this.fromGrouping(groupingCtx) : undefined;

    // Determine grouping position by comparing token positions
    // If grouping exists and its start position is before the LP token, it's 'before'
    let groupingPosition: 'before' | 'after' | undefined;
    if (grouping && groupingCtx) {
      const lpToken = ctx.LP();

      if (lpToken) {
        const groupingStart = groupingCtx.start?.start ?? 0;
        const lpStart = lpToken.symbol.start;
        groupingPosition = groupingStart < lpStart ? 'before' : 'after';
      }
    }

    const node = PromQLBuilder.expression.func.call(
      name,
      args,
      grouping,
      groupingPosition,
      this.getParserFields(ctx)
    );

    for (const arg of args) {
      if (arg.incomplete) {
        node.incomplete = true;
        break;
      }
    }

    if (grouping?.incomplete) {
      node.incomplete = true;
    }

    return node;
  }

  private fromGrouping(ctx: cst.GroupingContext): ast.PromQLGrouping {
    const byToken = ctx.BY();
    const kind: 'by' | 'without' = byToken ? 'by' : 'without';

    const labelListCtx = ctx.labelList();
    const labels = this.fromLabelList(labelListCtx);

    const node = PromQLBuilder.grouping(kind, labels, this.getParserFields(ctx));

    for (const label of labels) {
      if (label.incomplete) {
        node.incomplete = true;
        break;
      }
    }

    return node;
  }

  private fromLabelList(ctx: cst.LabelListContext): ast.PromQLLabelName[] {
    const labels: ast.PromQLLabelName[] = [];
    const labelNameCtxs = ctx.labelName_list();

    for (const labelNameCtx of labelNameCtxs) {
      const label = this.fromLabelName(labelNameCtx);

      if (label) {
        labels.push(label);
      }
    }

    return labels;
  }

  // ----------------------------------------------------------------- selector

  private fromSelector(ctx: cst.SelectorContext): ast.PromQLSelector {
    const seriesMatcherCtx = ctx.seriesMatcher();
    const { metric, labelMap } = this.fromSeriesMatcher(seriesMatcherCtx);

    // Range: [duration]
    const lsb = ctx.LSB();
    const durationCtx = ctx.duration();
    let range: ast.PromQLAstExpression | undefined;

    if (lsb && durationCtx) {
      range = this.fromDuration(durationCtx);
    }

    // Evaluation: offset and @
    const evaluationCtx = ctx.evaluation();
    const evaluation = evaluationCtx ? this.fromEvaluation(evaluationCtx) : undefined;

    const node = PromQLBuilder.expression.selector.node(
      {
        metric,
        labelMap,
        duration: range,
        evaluation,
      },
      this.getParserFields(ctx)
    );

    if (metric) {
      node.incomplete ||= metric?.incomplete;
    }

    if (labelMap) {
      node.incomplete ||= labelMap?.incomplete;
    }

    if (range) {
      node.incomplete ||= range?.incomplete;
    }

    if (evaluation) {
      node.incomplete ||= evaluation?.incomplete;
    }

    return node;
  }

  private fromSeriesMatcher(ctx: cst.SeriesMatcherContext): {
    metric: ast.PromQLIdentifier | undefined;
    labelMap: ast.PromQLLabelMap | undefined;
  } {
    const identCtx = ctx.identifier();
    const metric = identCtx ? this.fromIdentifier(identCtx) : undefined;

    const labelsCtx = ctx.labels();
    let labelMap: ast.PromQLLabelMap | undefined;

    if (labelsCtx) {
      labelMap = this.fromLabels(labelsCtx);
    } else if (ctx.LCB()) {
      // Empty braces {} - create empty labelMap
      const lcbToken = ctx.LCB().symbol;
      const rcbToken = ctx.RCB()?.symbol ?? lcbToken;
      labelMap = PromQLBuilder.labelMap([], {
        text: '{}',
        location: {
          min: lcbToken.start + this.offset,
          max: (rcbToken.stop ?? rcbToken.start) + this.offset,
        },
        incomplete: !ctx.RCB(),
      });
    }

    return { metric, labelMap };
  }

  private fromLabels(ctx: cst.LabelsContext): ast.PromQLLabelMap {
    const labels: ast.PromQLLabel[] = [];
    const labelCtxs = ctx.label_list();
    let incomplete: boolean = false;

    for (const labelCtx of labelCtxs) {
      const label = this.fromLabel(labelCtx);
      if (label) {
        labels.push(label);
        incomplete ||= label.incomplete;
      } else {
        incomplete = true;
      }
    }

    const node = PromQLBuilder.labelMap(labels, this.getParserFields(ctx));

    node.incomplete = incomplete;

    return node;
  }

  private fromLabel(ctx: cst.LabelContext): ast.PromQLLabel | undefined {
    const labelNameCtx = ctx.labelName();
    const labelName = labelNameCtx ? this.fromLabelName(labelNameCtx) : undefined;

    if (!labelName) return undefined;

    const kindToken = ctx._kind;
    let operator: ast.PromQLLabelMatchOperator = '=';

    if (kindToken) {
      const kindText = kindToken.text;
      if (kindText === '=' || kindText === '!=' || kindText === '=~' || kindText === '!~') {
        operator = kindText;
      }
    }

    const stringToken = ctx.STRING();
    let value: ast.PromQLStringLiteral | undefined;

    if (stringToken) {
      value = this.fromStringToken(stringToken.symbol);
    }

    const node = PromQLBuilder.label(labelName, operator, value, this.getParserFields(ctx));

    if (labelName.incomplete) {
      node.incomplete = true;
    }

    if (value?.incomplete) {
      node.incomplete = true;
    }

    return node;
  }

  private fromLabelName(ctx: cst.LabelNameContext): ast.PromQLLabelName | undefined {
    const identCtx = ctx.identifier();
    if (identCtx) {
      return this.fromIdentifier(identCtx);
    }

    const stringToken = ctx.STRING();
    if (stringToken) {
      return this.fromStringToken(stringToken.symbol);
    }

    const numberCtx = ctx.number_();
    if (numberCtx) {
      return this.fromNumber(numberCtx);
    }

    return undefined;
  }

  // ------------------------------------------------------------------- binary

  private fromArithmeticBinary(ctx: cst.ArithmeticBinaryContext): ast.PromQLAstExpression {
    const leftCtx = ctx._left;
    const rightCtx = ctx._right;
    const opToken = ctx._op;

    const left = leftCtx ? this.fromExpression(leftCtx) : undefined;
    const right = rightCtx ? this.fromExpression(rightCtx) : undefined;

    if (!left || !right) {
      return this.fromParserRuleToUnknown(ctx);
    }

    const operatorText = opToken?.text ?? '';
    const operator = this.toBinaryOperator(operatorText);

    // Check for BOOL modifier
    const boolToken = ctx.BOOL();
    const bool = !!boolToken;

    // Check for modifier (ON/IGNORING)
    const modifierCtx = ctx.modifier();
    const modifier = modifierCtx ? this.fromModifier(modifierCtx) : undefined;

    const node = PromQLBuilder.expression.binary(
      operator,
      left,
      right,
      { bool, modifier },
      this.getParserFields(ctx)
    );

    if (left.incomplete) {
      node.incomplete = true;
    }

    if (right.incomplete) {
      node.incomplete = true;
    }

    if (modifier?.incomplete) {
      node.incomplete = true;
    }

    return node;
  }

  private toBinaryOperator(text: string): ast.PromQLBinaryOperator {
    const lowerText = text.toLowerCase();

    return lowerText as ast.PromQLBinaryOperator;
  }

  private fromModifier(ctx: cst.ModifierContext): ast.PromQLModifier {
    const matchingToken = ctx._matching;
    const kind: 'on' | 'ignoring' = matchingToken?.text?.toLowerCase() === 'on' ? 'on' : 'ignoring';

    const labelListCtx = ctx._modifierLabels;
    const labels = labelListCtx ? this.fromLabelList(labelListCtx) : [];

    // Group modifier (group_left/group_right)
    const joiningToken = ctx._joining;
    let groupModifier: ast.PromQLGroupModifier | undefined;

    if (joiningToken) {
      const joiningKind: 'group_left' | 'group_right' =
        joiningToken.text?.toLowerCase() === 'group_left' ? 'group_left' : 'group_right';

      const groupLabelsCtx = ctx._groupLabels;
      const groupLabels = groupLabelsCtx ? this.fromLabelList(groupLabelsCtx) : [];

      groupModifier = PromQLBuilder.groupModifier(joiningKind, groupLabels, {
        text: joiningToken.text ?? '',
        location: getPosition(joiningToken, joiningToken),
        incomplete: false,
      });

      for (const label of groupLabels) {
        if (label.incomplete) {
          groupModifier.incomplete = true;
          break;
        }
      }
    }

    const node = PromQLBuilder.modifier(kind, labels, groupModifier, this.getParserFields(ctx));

    for (const label of labels) {
      if (label.incomplete) {
        node.incomplete = true;
        break;
      }
    }

    if (groupModifier?.incomplete) {
      node.incomplete = true;
    }

    return node;
  }

  // ------------------------------------------------------------ parenthesized

  private fromParenthesized(ctx: cst.ParenthesizedContext): ast.PromQLAstExpression {
    const exprCtx = ctx.expression();
    const child = exprCtx ? this.fromExpression(exprCtx) : undefined;

    if (!child) {
      return this.fromParserRuleToUnknown(ctx);
    }

    const node = PromQLBuilder.expression.parens(child, this.getParserFields(ctx));

    if (child.incomplete) {
      node.incomplete = true;
    }

    return node;
  }

  // ----------------------------------------------------------------- subquery

  private fromSubquery(ctx: cst.SubqueryContext): ast.PromQLAstExpression {
    const exprCtx = ctx.expression();
    const expr = exprCtx ? this.fromExpression(exprCtx) : undefined;

    if (!expr) {
      return this.fromParserRuleToUnknown(ctx);
    }

    const rangeCtx = ctx._range;
    const range = rangeCtx ? this.fromDuration(rangeCtx) : undefined;

    if (!range) {
      return this.fromParserRuleToUnknown(ctx);
    }

    // Resolution from subqueryResolution
    const resolutionCtx = ctx.subqueryResolution();
    let resolution: ast.PromQLAstExpression | undefined;

    if (resolutionCtx) {
      // Check for duration first (COLON duration?)
      const resDurationCtx = resolutionCtx._resolution;
      if (resDurationCtx) {
        resolution = this.fromDuration(resDurationCtx);
      } else {
        // Check for TIME_VALUE_WITH_COLON (e.g., ":5m")
        const timeValueWithColon = resolutionCtx.TIME_VALUE_WITH_COLON();
        if (timeValueWithColon) {
          // TIME_VALUE_WITH_COLON includes the leading colon, e.g., ":5m"
          // We need to strip the colon to get the time value
          const text = timeValueWithColon.getText();
          const timeValue = text.startsWith(':') ? text.slice(1) : text;
          resolution = PromQLBuilder.expression.literal.time(
            timeValue,
            this.createParserFieldsFromToken(timeValueWithColon.symbol, timeValue)
          );
        }
      }
    }

    const evaluationCtx = ctx.evaluation();
    const evaluation = evaluationCtx ? this.fromEvaluation(evaluationCtx) : undefined;

    const node = PromQLBuilder.expression.subquery(
      expr,
      range,
      resolution,
      evaluation,
      this.getParserFields(ctx)
    );

    if (expr.incomplete) {
      node.incomplete = true;
    }

    if (range.incomplete) {
      node.incomplete = true;
    }

    if (resolution?.incomplete) {
      node.incomplete = true;
    }

    if (evaluation?.incomplete) {
      node.incomplete = true;
    }

    return node;
  }

  // --------------------------------------------------------------- evaluation

  private fromEvaluation(ctx: cst.EvaluationContext): ast.PromQLEvaluation {
    const offsetCtx = ctx.offset();
    const atCtx = ctx.at();

    const offset = offsetCtx ? this.fromOffset(offsetCtx) : undefined;
    const at = atCtx ? this.fromAt(atCtx) : undefined;

    const node = PromQLBuilder.evaluation(offset, at, this.getParserFields(ctx));

    if (offset?.incomplete) {
      node.incomplete = true;
    }

    if (at?.incomplete) {
      node.incomplete = true;
    }

    return node;
  }

  private fromOffset(ctx: cst.OffsetContext): ReturnType<typeof PromQLBuilder.offset> {
    const minusToken = ctx.MINUS();
    const negative = !!minusToken;

    const durationCtx = ctx.duration();
    const duration = durationCtx
      ? this.fromDuration(durationCtx)
      : PromQLBuilder.unknown({ incomplete: true });

    const node = PromQLBuilder.offset(duration, negative, this.getParserFields(ctx));

    if (duration.incomplete) {
      node.incomplete = true;
    }

    return node;
  }

  private fromAt(ctx: cst.AtContext): ReturnType<typeof PromQLBuilder.at> {
    const minusToken = ctx.MINUS();
    const negative = !!minusToken;

    const atStartToken = ctx.AT_START();
    const atEndToken = ctx.AT_END();

    if (atStartToken) {
      return PromQLBuilder.at('start()', negative, this.getParserFields(ctx));
    }

    if (atEndToken) {
      return PromQLBuilder.at('end()', negative, this.getParserFields(ctx));
    }

    const timeValueCtx = ctx.timeValue();
    const timeValue = timeValueCtx
      ? this.fromTimeValue(timeValueCtx)
      : PromQLBuilder.expression.literal.time('', { incomplete: true });

    const node = PromQLBuilder.at(timeValue, negative, this.getParserFields(ctx));

    if (timeValue.incomplete) {
      node.incomplete = true;
    }

    return node;
  }

  // ----------------------------------------------------------------- duration

  private fromDuration(ctx: cst.DurationContext): ast.PromQLAstExpression {
    // Duration is now defined as `expression` in the grammar
    const exprCtx = ctx.expression();
    if (exprCtx) {
      return this.fromExpression(exprCtx) ?? this.fromParserRuleToUnknown(ctx);
    }

    return this.fromParserRuleToUnknown(ctx);
  }

  // ----------------------------------------------------------------- constant

  private fromConstant(ctx: cst.ConstantContext): ast.PromQLAstExpression {
    const numberCtx = ctx.number_();
    if (numberCtx) {
      return this.fromNumber(numberCtx);
    }

    const stringCtx = ctx.string_();
    if (stringCtx) {
      return this.fromString(stringCtx);
    }

    const timeValueCtx = ctx.timeValue();
    if (timeValueCtx) {
      return this.fromTimeValue(timeValueCtx);
    }

    return this.fromParserRuleToUnknown(ctx);
  }

  // ------------------------------------------------------------------- number

  private fromNumber(ctx: cst.NumberContext): ast.PromQLNumericLiteral {
    const text = ctx.getText();
    const parserFields = this.getParserFields(ctx);

    // Integer
    if (ctx instanceof cst.IntegerLiteralContext) {
      const value = parseInt(text, 10);
      return PromQLBuilder.expression.literal.integer(value, parserFields);
    }

    // Decimal
    if (ctx instanceof cst.DecimalLiteralContext) {
      const lowerText = text.toLowerCase();
      let value: number;
      if (lowerText === 'inf') {
        value = Infinity;
      } else if (lowerText === 'nan') {
        value = NaN;
      } else {
        value = parseFloat(text);
      }
      return PromQLBuilder.expression.literal.decimal(value, parserFields);
    }

    // Hexadecimal
    if (ctx instanceof cst.HexLiteralContext) {
      const value = parseInt(text, 16);
      return PromQLBuilder.expression.literal.hexadecimal(value, text, parserFields);
    }

    // Fallback
    return PromQLBuilder.expression.literal.integer(0, { ...parserFields, incomplete: true });
  }

  // ------------------------------------------------------------------- string

  private fromString(ctx: cst.StringContext): ast.PromQLStringLiteral {
    const token = ctx.STRING();
    if (token) {
      return this.fromStringToken(token.symbol);
    }

    const text = ctx.getText();
    return PromQLBuilder.expression.literal.string('', text, this.getParserFields(ctx));
  }

  private fromStringToken(token: antlr.Token): ast.PromQLStringLiteral {
    const text = token.text ?? '';
    const valueUnquoted = this.unquoteString(text);

    return PromQLBuilder.expression.literal.string(
      valueUnquoted,
      text,
      this.createParserFieldsFromToken(token)
    );
  }

  private unquoteString(text: string): string {
    if (text.length < 2) return text;

    const firstChar = text[0];
    const lastChar = text[text.length - 1];

    // Single or double quoted
    if ((firstChar === '"' || firstChar === "'") && firstChar === lastChar) {
      return text.slice(1, -1).replace(/\\([abfnrtv\\'""])/g, (_, char) => {
        switch (char) {
          case 'a':
            return '\x07';
          case 'b':
            return '\b';
          case 'f':
            return '\f';
          case 'n':
            return '\n';
          case 'r':
            return '\r';
          case 't':
            return '\t';
          case 'v':
            return '\v';
          default:
            return char;
        }
      });
    }

    // Backtick quoted (raw string)
    if (firstChar === '`' && lastChar === '`') {
      return text.slice(1, -1);
    }

    return text;
  }

  // --------------------------------------------------------------- time value

  private fromTimeValue(ctx: cst.TimeValueContext): ast.PromQLTimeValue {
    const text = ctx.getText();
    const parserFields = this.getParserFields(ctx);

    const timeWithColonToken = ctx.TIME_VALUE_WITH_COLON();
    if (timeWithColonToken) {
      return PromQLBuilder.expression.literal.time(text, parserFields);
    }

    const timeToken = ctx.TIME_VALUE();
    if (timeToken) {
      return PromQLBuilder.expression.literal.time(text, parserFields);
    }

    // Number as time value
    const numberCtx = ctx.number_();
    if (numberCtx) {
      return PromQLBuilder.expression.literal.time(text, parserFields);
    }

    return PromQLBuilder.expression.literal.time(text, { ...parserFields, incomplete: true });
  }

  // --------------------------------------------------------------- identifier

  private fromIdentifier(ctx: cst.IdentifierContext): ast.PromQLIdentifier {
    const identToken = ctx.IDENTIFIER();
    if (identToken) {
      return PromQLBuilder.identifier(
        identToken.getText(),
        this.createParserFieldsFromToken(identToken.symbol)
      );
    }

    // Non-reserved keywords can be used as identifiers
    const nonReservedCtx = ctx.nonReserved();
    if (nonReservedCtx) {
      return PromQLBuilder.identifier(nonReservedCtx.getText(), this.getParserFields(ctx));
    }

    return PromQLBuilder.identifier(ctx.getText(), this.getParserFields(ctx));
  }
}
