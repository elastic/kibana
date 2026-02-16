/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type {
  PromQLAstExpression,
  PromQLAstQueryExpression,
  PromQLBinaryExpression,
  PromQLFunction,
  PromQLGrouping,
  PromQLGroupModifier,
  PromQLIdentifier,
  PromQLLabel,
  PromQLLabelMap,
  PromQLLabelName,
  PromQLLiteral,
  PromQLModifier,
  PromQLNumericLiteral,
  PromQLParens,
  PromQLSelector,
  PromQLStringLiteral,
  PromQLSubquery,
  PromQLTimeValue,
  PromQLUnaryExpression,
  PromQLEvaluation,
  PromQLOffset,
  PromQLAt,
} from '../types';
import {
  PromQLPrecedenceGroup,
  promqlBinaryPrecedenceGroup,
  isPromQLRightAssociative,
} from './helpers';

export interface PromQLBasicPrettyPrinterOptions {
  /**
   * Whether to lowercase function and aggregation names.
   * @default false (keeps original case)
   */
  lowercaseFunctions?: boolean;

  /**
   * Whether to lowercase keywords like `by`, `without`, `on`, `ignoring`, etc.
   * @default false (keeps original case)
   */
  lowercaseKeywords?: boolean;

  /**
   * Whether to lowercase operators like `and`, `or`, `unless`.
   * @default false (keeps original case)
   */
  lowercaseOperators?: boolean;
}

/**
 * A basic pretty-printer for PromQL AST nodes that outputs a single-line
 * string representation with minimal formatting (one space between nodes).
 */
export class PromQLBasicPrettyPrinter {
  /**
   * Print any PromQL AST node.
   */
  public static readonly print = (
    node: PromQLAstQueryExpression | PromQLAstExpression,
    opts?: PromQLBasicPrettyPrinterOptions
  ): string => {
    const printer = new PromQLBasicPrettyPrinter(opts);
    return printer.print(node);
  };

  /**
   * Print a PromQL query expression.
   */
  public static readonly query = (
    query: PromQLAstQueryExpression,
    opts?: PromQLBasicPrettyPrinterOptions
  ): string => {
    const printer = new PromQLBasicPrettyPrinter(opts);
    return printer.printQuery(query);
  };

  /**
   * Print a PromQL expression.
   */
  public static readonly expression = (
    expr: PromQLAstExpression,
    opts?: PromQLBasicPrettyPrinterOptions
  ): string => {
    const printer = new PromQLBasicPrettyPrinter(opts);
    return printer.printExpression(expr);
  };

  protected readonly opts: Required<PromQLBasicPrettyPrinterOptions>;

  constructor(opts: PromQLBasicPrettyPrinterOptions = {}) {
    this.opts = {
      lowercaseFunctions: opts.lowercaseFunctions ?? false,
      lowercaseKeywords: opts.lowercaseKeywords ?? false,
      lowercaseOperators: opts.lowercaseOperators ?? false,
    };
  }

  public print(node: PromQLAstQueryExpression | PromQLAstExpression): string {
    if (node.type === 'query') {
      return this.printQuery(node);
    }
    return this.printExpression(node);
  }

  public printQuery(query: PromQLAstQueryExpression): string {
    if (!query.expression) {
      return '';
    }
    return this.printExpression(query.expression);
  }

  public printExpression(expr: PromQLAstExpression | undefined): string {
    if (!expr) {
      return '';
    }

    switch (expr.type) {
      case 'function':
        return this.printFunction(expr);
      case 'selector':
        return this.printSelector(expr);
      case 'binary-expression':
        return this.printBinaryExpression(expr);
      case 'unary-expression':
        return this.printUnaryExpression(expr);
      case 'subquery':
        return this.printSubquery(expr);
      case 'parens':
        return this.printParens(expr);
      case 'literal':
        return this.printLiteral(expr);
      case 'identifier':
        return this.printIdentifier(expr);
      case 'unknown':
        return '<unknown>';
      default:
        return '';
    }
  }

  protected printFunction(node: PromQLFunction): string {
    const name = this.opts.lowercaseFunctions ? node.name.toLowerCase() : node.name;
    const args = node.args.map((arg) => this.printExpression(arg)).join(', ');
    const grouping = node.grouping ? this.printGrouping(node.grouping) : '';

    if (grouping && node.groupingPosition === 'before') {
      // sum by (job) (...)
      return `${name} ${grouping} (${args})`;
    } else if (grouping) {
      // sum(...) by (job)
      return `${name}(${args}) ${grouping}`;
    } else {
      // rate(...)
      return `${name}(${args})`;
    }
  }

  protected printGrouping(node: PromQLGrouping): string {
    const keyword = this.opts.lowercaseKeywords ? node.name.toLowerCase() : node.name;
    const labels = node.args.map((l) => this.printLabelName(l)).join(', ');
    return `${keyword} (${labels})`;
  }

  protected printSelector(node: PromQLSelector): string {
    let result = '';

    // Metric name
    if (node.metric) {
      result += this.printIdentifier(node.metric);
    }

    // Label map
    if (node.labelMap) {
      result += this.printLabelMap(node.labelMap);
    }

    // Range (e.g., [5m])
    if (node.duration) {
      result += `[${this.printExpression(node.duration)}]`;
    }

    // Evaluation modifiers (offset, @)
    if (node.evaluation) {
      result += this.printEvaluation(node.evaluation);
    }

    return result;
  }

  protected printLabelMap(node: PromQLLabelMap): string {
    const labels = node.args.map((l) => this.printLabel(l)).join(', ');
    return `{${labels}}`;
  }

  protected printLabel(node: PromQLLabel): string {
    const labelName = this.printLabelName(node.labelName);
    const value = node.value ? this.printLiteral(node.value) : '';
    return `${labelName}${node.operator}${value}`;
  }

  protected printLabelName(node: PromQLLabelName): string {
    switch (node.type) {
      case 'identifier':
        return this.printIdentifier(node);
      case 'literal':
        return this.printLiteral(node);
      default:
        return '';
    }
  }

  protected printEvaluation(node: PromQLEvaluation): string {
    let result = '';

    if (node.offset) {
      result += ` ${this.printOffset(node.offset)}`;
    }

    if (node.at) {
      result += ` ${this.printAt(node.at)}`;
    }

    return result;
  }

  protected printOffset(node: PromQLOffset): string {
    const keyword = 'offset';
    const sign = node.negative ? '- ' : '';
    const duration = this.printExpression(node.duration);
    return `${keyword} ${sign}${duration}`;
  }

  protected printAt(node: PromQLAt): string {
    const sign = node.negative ? '- ' : '';

    if (typeof node.value === 'string') {
      return `@ ${sign}${node.value}`;
    }

    return `@ ${sign}${this.printLiteral(node.value)}`;
  }

  protected printBinaryExpression(node: PromQLBinaryExpression): string {
    const group = promqlBinaryPrecedenceGroup(node);
    const leftGroup = promqlBinaryPrecedenceGroup(node.left);
    const rightGroup = promqlBinaryPrecedenceGroup(node.right);
    const operator = this.formatOperator(node.name);
    const isRightAssociative = isPromQLRightAssociative(node.name);
    let left = this.printExpression(node.left);
    let right = this.printExpression(node.right);

    if (
      leftGroup !== PromQLPrecedenceGroup.none &&
      (leftGroup < group || (leftGroup === group && isRightAssociative))
    ) {
      left = `(${left})`;
    }

    if (
      rightGroup !== PromQLPrecedenceGroup.none &&
      (rightGroup < group || (rightGroup === group && !isRightAssociative))
    ) {
      right = `(${right})`;
    }

    let modifiers = '';

    if (node.bool) {
      const boolKeyword = 'bool';
      modifiers += ` ${boolKeyword}`;
    }

    if (node.modifier) {
      modifiers += ` ${this.printModifier(node.modifier)}`;
    }

    return `${left} ${operator}${modifiers} ${right}`;
  }

  protected printModifier(node: PromQLModifier): string {
    const keyword = this.opts.lowercaseKeywords ? node.name.toLowerCase() : node.name;
    const labels = node.labels.map((l) => this.printLabelName(l)).join(', ');

    let result = `${keyword}(${labels})`;

    if (node.groupModifier) {
      result += ` ${this.printGroupModifier(node.groupModifier)}`;
    }

    return result;
  }

  protected printGroupModifier(node: PromQLGroupModifier): string {
    const keyword = this.opts.lowercaseKeywords ? node.name.toLowerCase() : node.name;
    const labels = node.labels.map((l) => this.printLabelName(l)).join(', ');

    if (labels) {
      return `${keyword}(${labels})`;
    }
    return keyword;
  }

  protected formatOperator(op: string): string {
    // Set operators (and, or, unless) might need case formatting
    if (op === 'and' || op === 'or' || op === 'unless') {
      return this.opts.lowercaseOperators ? op.toLowerCase() : op;
    }
    return op;
  }

  protected printUnaryExpression(node: PromQLUnaryExpression): string {
    const arg = this.printExpression(node.arg);
    return `${node.name}${arg}`;
  }

  protected printSubquery(node: PromQLSubquery): string {
    const expr = this.printExpression(node.expr);
    const range = this.printExpression(node.range);
    const resolution = node.resolution ? this.printExpression(node.resolution) : '';

    let result = `${expr}[${range}:${resolution}]`;

    if (node.evaluation) {
      result += this.printEvaluation(node.evaluation);
    }

    return result;
  }

  protected printParens(node: PromQLParens): string {
    const child = this.printExpression(node.child);
    return `(${child})`;
  }

  protected printLiteral(node: PromQLLiteral): string {
    switch (node.literalType) {
      case 'integer':
        return this.printIntegerLiteral(node);
      case 'decimal':
        return this.printDecimalLiteral(node);
      case 'hexadecimal':
        return this.printHexLiteral(node as PromQLNumericLiteral);
      case 'string':
        return this.printStringLiteral(node as PromQLStringLiteral);
      case 'time':
        return this.printTimeLiteral(node as PromQLTimeValue);
      default:
        return String((node as PromQLNumericLiteral).value);
    }
  }

  protected printIntegerLiteral(node: PromQLNumericLiteral): string {
    return String(node.value);
  }

  protected printDecimalLiteral(node: PromQLNumericLiteral): string {
    const value = node.value;

    // Handle special values
    if (Number.isNaN(value)) {
      return 'NaN';
    }
    if (!Number.isFinite(value)) {
      return value > 0 ? 'Inf' : '-Inf';
    }

    // Ensure decimal point is present for whole numbers stored as decimals
    const str = String(value);
    if (!str.includes('.') && !str.includes('e') && !str.includes('E')) {
      return str + '.0';
    }
    return str;
  }

  protected printHexLiteral(node: PromQLNumericLiteral): string {
    return '0x' + node.value.toString(16);
  }

  protected printStringLiteral(node: PromQLStringLiteral): string {
    const { value, valueUnquoted } = node;

    // If value differs from valueUnquoted, it's from the parser and already has quotes
    // Just return it as-is to preserve original formatting (single vs double quotes, etc.)
    if (value !== valueUnquoted) {
      return value;
    }

    // Synthetic string - format with double quotes and proper escaping
    const escaped = valueUnquoted
      .replace(/\\/g, '\\\\')
      .replace(/"/g, '\\"')
      .replace(/\n/g, '\\n')
      .replace(/\r/g, '\\r')
      .replace(/\t/g, '\\t');

    return `"${escaped}"`;
  }

  protected printTimeLiteral(node: PromQLTimeValue): string {
    return node.value;
  }

  protected printIdentifier(node: PromQLIdentifier): string {
    return node.name;
  }
}
