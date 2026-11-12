/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { isEqual } from 'lodash';
import { JsonPathError } from './json_path_error';

/** A node selected by a JSONPath query, with the container and key it sits under. */
export interface JsonPathNode {
  readonly value: unknown;
  readonly parent?: Record<string, unknown> | unknown[];
  readonly key?: string | number;
}

type Selector =
  | { readonly kind: 'name'; readonly name: string }
  | { readonly kind: 'wildcard' }
  | { readonly kind: 'index'; readonly index: number }
  | {
      readonly kind: 'slice';
      readonly start?: number;
      readonly end?: number;
      readonly step?: number;
    }
  | { readonly kind: 'filter'; readonly expression: Expression };

interface Segment {
  readonly descendant: boolean;
  readonly selectors: readonly Selector[];
}

interface Query {
  readonly kind: 'query';
  readonly root: '$' | '@';
  readonly segments: readonly Segment[];
}

type Operand = { readonly kind: 'literal'; readonly value: unknown } | Query;

type Expression =
  | { readonly kind: 'or' | 'and'; readonly left: Expression; readonly right: Expression }
  | { readonly kind: 'not'; readonly expression: Expression }
  | {
      readonly kind: 'compare';
      readonly operator: string;
      readonly left: Operand;
      readonly right: Operand;
    }
  | { readonly kind: 'exists'; readonly query: Query };

const NAME_CHAR = /[\w$\-\u0080-\uffff]/;
const COMPARISON = /^(==|!=|<=|>=|<|>)/;
const NUMBER = /^-?\d+(\.\d+)?([eE][+-]?\d+)?/;
const KEYWORDS = { true: true, false: false, null: null } as const;
const ESCAPES: Readonly<Record<string, string>> = {
  b: '\b',
  f: '\f',
  n: '\n',
  r: '\r',
  t: '\t',
};

const isObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

// Parses the RFC 9535 subset used by OpenAPI overlays: names, indexes, wildcards, unions,
// descendants and filters with comparisons, `&&`, `||`, `!` and existence tests.
class Parser {
  private offset = 0;

  constructor(private readonly path: string) {}

  parse(): Query {
    this.skipSpace();
    const query = this.parseQuery('$');
    this.skipSpace();
    if (this.offset < this.path.length) {
      this.fail('Unexpected character');
    }
    return query;
  }

  private fail(problem: string): never {
    throw new JsonPathError(this.path, this.offset, problem);
  }

  private peek(text: string): boolean {
    return this.path.startsWith(text, this.offset);
  }

  private consume(text: string): boolean {
    if (!this.peek(text)) {
      return false;
    }
    this.offset += text.length;
    return true;
  }

  private expect(text: string): void {
    if (!this.consume(text)) {
      this.fail(`Expected "${text}"`);
    }
  }

  private skipSpace(): void {
    while (/\s/.test(this.path[this.offset] ?? '')) {
      this.offset++;
    }
  }

  private consumeOperator(operator: string): boolean {
    this.skipSpace();
    return this.consume(operator);
  }

  private parseQuery(root: '$' | '@'): Query {
    this.expect(root);
    const segments: Segment[] = [];
    for (;;) {
      if (this.consume('..')) {
        segments.push({ descendant: true, selectors: this.parseSegmentSelectors() });
      } else if (this.consume('.')) {
        segments.push({ descendant: false, selectors: this.parseSegmentSelectors() });
      } else if (this.peek('[')) {
        segments.push({ descendant: false, selectors: this.parseBracket() });
      } else {
        return { kind: 'query', root, segments };
      }
    }
  }

  private parseSegmentSelectors(): Selector[] {
    if (this.peek('[')) {
      return this.parseBracket();
    }
    if (this.consume('*')) {
      return [{ kind: 'wildcard' }];
    }
    const start = this.offset;
    while (NAME_CHAR.test(this.path[this.offset] ?? '')) {
      this.offset++;
    }
    if (start === this.offset) {
      this.fail('Expected a member name');
    }
    return [{ kind: 'name', name: this.path.slice(start, this.offset) }];
  }

  private parseBracket(): Selector[] {
    this.expect('[');
    const selectors: Selector[] = [];
    do {
      this.skipSpace();
      selectors.push(this.parseSelector());
      this.skipSpace();
    } while (this.consume(','));
    this.expect(']');
    return selectors;
  }

  private parseSelector(): Selector {
    if (this.consume('*')) {
      return { kind: 'wildcard' };
    }
    if (this.consume('?')) {
      return { kind: 'filter', expression: this.parseOr() };
    }
    if (this.peek("'") || this.peek('"')) {
      return { kind: 'name', name: this.parseString() };
    }
    const index = this.parseInteger();
    if (!this.peek(':')) {
      if (index === undefined) {
        this.fail('Unsupported selector');
      }
      return { kind: 'index', index };
    }
    this.expect(':');
    const end = this.parseInteger();
    const step = this.consumeOperator(':') ? this.parseInteger() : undefined;
    return { kind: 'slice', start: index, end, step };
  }

  private parseInteger(): number | undefined {
    this.skipSpace();
    const match = /^-?\d+/.exec(this.path.slice(this.offset));
    if (!match) {
      return undefined;
    }
    this.offset += match[0].length;
    this.skipSpace();
    return Number(match[0]);
  }

  private parseString(): string {
    const quote = this.path[this.offset++];
    let result = '';
    while (this.offset < this.path.length && this.path[this.offset] !== quote) {
      const char = this.path[this.offset++];
      if (char !== '\\') {
        result += char;
        continue;
      }
      const escaped = this.path[this.offset++];
      result += ESCAPES[escaped] ?? (escaped === 'u' ? this.parseUnicodeEscape() : escaped);
    }
    this.expect(quote);
    return result;
  }

  private parseUnicodeEscape(): string {
    const hex = this.path.slice(this.offset, this.offset + 4);
    if (!/^[0-9a-fA-F]{4}$/.test(hex)) {
      this.fail('Invalid unicode escape');
    }
    this.offset += 4;
    return String.fromCharCode(parseInt(hex, 16));
  }

  private parseOr(): Expression {
    let left = this.parseAnd();
    while (this.consumeOperator('||')) {
      left = { kind: 'or', left, right: this.parseAnd() };
    }
    return left;
  }

  private parseAnd(): Expression {
    let left = this.parseUnary();
    while (this.consumeOperator('&&')) {
      left = { kind: 'and', left, right: this.parseUnary() };
    }
    return left;
  }

  private parseUnary(): Expression {
    this.skipSpace();
    if (this.consume('!')) {
      return { kind: 'not', expression: this.parseUnary() };
    }
    if (this.consume('(')) {
      const expression = this.parseOr();
      this.skipSpace();
      this.expect(')');
      return expression;
    }
    const left = this.parseOperand();
    this.skipSpace();
    const operator = COMPARISON.exec(this.path.slice(this.offset))?.[0];
    if (operator) {
      this.offset += operator.length;
      this.skipSpace();
      return { kind: 'compare', operator, left, right: this.parseOperand() };
    }
    if (left.kind === 'literal') {
      this.fail('Expected a comparison');
    }
    return { kind: 'exists', query: left };
  }

  private parseOperand(): Operand {
    if (this.peek('@') || this.peek('$')) {
      return this.parseQuery(this.peek('@') ? '@' : '$');
    }
    if (this.peek("'") || this.peek('"')) {
      return { kind: 'literal', value: this.parseString() };
    }
    const rest = this.path.slice(this.offset);
    const number = NUMBER.exec(rest)?.[0];
    if (number) {
      this.offset += number.length;
      return { kind: 'literal', value: Number(number) };
    }
    for (const [keyword, value] of Object.entries(KEYWORDS)) {
      if (rest.startsWith(keyword) && !NAME_CHAR.test(rest[keyword.length] ?? '')) {
        this.offset += keyword.length;
        return { kind: 'literal', value };
      }
    }
    this.fail(/^[a-z]+\(/.test(rest) ? 'Functions are not supported' : 'Expected a value');
  }
}

const children = ({ value }: JsonPathNode): JsonPathNode[] => {
  if (Array.isArray(value)) {
    return value.map((item, key) => ({ value: item, parent: value, key }));
  }
  return isObject(value)
    ? Object.entries(value).map(([key, item]) => ({ value: item, parent: value, key }))
    : [];
};

const withDescendants = (node: JsonPathNode): JsonPathNode[] => [
  node,
  ...children(node).flatMap(withDescendants),
];

const NOTHING = Symbol('nothing');

const evaluateOperand = (operand: Operand, root: unknown, current: unknown): unknown => {
  if (operand.kind === 'literal') {
    return operand.value;
  }
  const nodes = evaluateQuery(operand, root, current);
  return nodes.length === 1 ? nodes[0].value : NOTHING;
};

const isLess = (left: unknown, right: unknown): boolean =>
  (typeof left === 'number' && typeof right === 'number' && left < right) ||
  (typeof left === 'string' && typeof right === 'string' && left < right);

// Per RFC 9535, `<=` is `<` or `==`, and values of different types are never ordered.
const compare = (operator: string, left: unknown, right: unknown): boolean => {
  switch (operator) {
    case '==':
      return isEqual(left, right);
    case '!=':
      return !isEqual(left, right);
    case '<':
      return isLess(left, right);
    case '>':
      return isLess(right, left);
    case '<=':
      return isLess(left, right) || isEqual(left, right);
    default:
      return isLess(right, left) || isEqual(left, right);
  }
};

const test = (expression: Expression, root: unknown, current: unknown): boolean => {
  switch (expression.kind) {
    case 'or':
      return test(expression.left, root, current) || test(expression.right, root, current);
    case 'and':
      return test(expression.left, root, current) && test(expression.right, root, current);
    case 'not':
      return !test(expression.expression, root, current);
    case 'exists':
      return evaluateQuery(expression.query, root, current).length > 0;
    case 'compare':
      return compare(
        expression.operator,
        evaluateOperand(expression.left, root, current),
        evaluateOperand(expression.right, root, current)
      );
  }
};

// RFC 9535 slice semantics: negative bounds count from the end, and a negative step walks back.
const sliceIndexes = (
  length: number,
  { start, end, step = 1 }: { start?: number; end?: number; step?: number }
): number[] => {
  if (step === 0) {
    return [];
  }
  const clamp = (bound: number, low: number, high: number) =>
    Math.min(Math.max(bound < 0 ? length + bound : bound, low), high);
  const indexes: number[] = [];
  if (step > 0) {
    for (
      let index = clamp(start ?? 0, 0, length);
      index < clamp(end ?? length, 0, length);
      index += step
    ) {
      indexes.push(index);
    }
    return indexes;
  }
  const lower = end === undefined ? -1 : clamp(end, -1, length - 1);
  for (let index = clamp(start ?? length - 1, -1, length - 1); index > lower; index += step) {
    indexes.push(index);
  }
  return indexes;
};

const select = (node: JsonPathNode, selector: Selector, root: unknown): JsonPathNode[] => {
  const { value } = node;
  switch (selector.kind) {
    case 'name':
      return isObject(value) && Object.hasOwn(value, selector.name)
        ? [{ value: value[selector.name], parent: value, key: selector.name }]
        : [];
    case 'index': {
      if (!Array.isArray(value)) {
        return [];
      }
      const key = selector.index < 0 ? value.length + selector.index : selector.index;
      return key >= 0 && key < value.length ? [{ value: value[key], parent: value, key }] : [];
    }
    case 'slice':
      return Array.isArray(value)
        ? sliceIndexes(value.length, selector).map((key) => ({
            value: value[key],
            parent: value,
            key,
          }))
        : [];
    case 'wildcard':
      return children(node);
    case 'filter':
      return children(node).filter((child) => test(selector.expression, root, child.value));
  }
};

const evaluateQuery = (query: Query, root: unknown, current: unknown): JsonPathNode[] => {
  let nodes: JsonPathNode[] = [{ value: query.root === '$' ? root : current }];
  for (const { descendant, selectors } of query.segments) {
    nodes = (descendant ? nodes.flatMap(withDescendants) : nodes).flatMap((node) =>
      selectors.flatMap((selector) => select(node, selector, root))
    );
  }
  return nodes;
};

/**
 * Returns the nodes of a document that a JSONPath expression selects, in document order. Throws
 * a {@link JsonPathError} for expressions outside the supported subset.
 */
export const queryJsonPath = (document: unknown, path: string): JsonPathNode[] =>
  evaluateQuery(new Parser(path).parse(), document, document);
