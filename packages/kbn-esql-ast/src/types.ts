/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

export type ESQLAst = ESQLAstCommand[];

export type ESQLAstCommand = ESQLCommand | ESQLAstMetricsCommand;

export type ESQLAstNode = ESQLAstCommand | ESQLAstItem;

/**
 * Represents an *expression* in the AST.
 */
export type ESQLSingleAstItem =
  | ESQLFunction // "function call expression"
  | ESQLCommandOption
  | ESQLSource // "source identifier expression"
  | ESQLColumn // "field identifier expression"
  | ESQLTimeInterval
  | ESQLList // "list expression"
  | ESQLLiteral // "literal expression"
  | ESQLCommandMode
  | ESQLInlineCast // "inline cast expression"
  | ESQLUnknownItem;

export type ESQLAstField = ESQLFunction | ESQLColumn;

/**
 * An array of AST nodes represents different things in different contexts.
 * For example, in command top level arguments it is treated as an "assignment expression".
 */
export type ESQLAstItem = ESQLSingleAstItem | ESQLAstItem[];

export type ESQLAstNodeWithArgs = ESQLCommand | ESQLCommandOption | ESQLFunction;

/**
 * *Proper* are nodes which are objects with `type` property, once we get rid
 * of the nodes which are plain arrays, all nodes will be *proper* and we can
 * remove this type.
 */
export type ESQLProperNode = ESQLSingleAstItem | ESQLAstCommand;

export interface ESQLLocation {
  min: number;
  max: number;
}

export interface ESQLAstBaseItem<Name = string> {
  name: Name;
  text: string;
  location: ESQLLocation;
  incomplete: boolean;
}

export interface ESQLCommand<Name = string> extends ESQLAstBaseItem<Name> {
  type: 'command';
  args: ESQLAstItem[];
}

export interface ESQLAstMetricsCommand extends ESQLCommand<'metrics'> {
  sources: ESQLSource[];
  aggregates?: ESQLAstField[];
  grouping?: ESQLAstField[];
}

export interface ESQLCommandOption extends ESQLAstBaseItem {
  type: 'option';
  args: ESQLAstItem[];
}

/**
 * Right now rename expressions ("clauses") are parsed as options in the
 * RENAME command.
 */
export interface ESQLAstRenameExpression extends ESQLCommandOption {
  name: 'as';
}

export interface ESQLCommandMode extends ESQLAstBaseItem {
  type: 'mode';
}

/**
 * We coalesce all function calls and expressions into a single "function"
 * node type. This subtype is used to distinguish between different types
 * of function calls and expressions.
 *
 * - `variadic-call` is a function call with any number of arguments: fn(a, b, c, ...)
 * - `unary-expression` is a unary expression: -a, +a, NOT a, ...
 * - `binary-expression` is a binary expression: a + b, a - b, a * b, ...
 */
export type FunctionSubtype =
  | 'variadic-call' // fn(a, b, c, ...)
  | 'unary-expression' // -a, +a, NOT a, ...
  | 'postfix-unary-expression' // a IS NULL, a IS NOT NULL, ...
  | 'binary-expression'; // a + b, a - b, a * b, ...

export interface ESQLFunction<
  Subtype extends FunctionSubtype = FunctionSubtype,
  Name extends string = string
> extends ESQLAstBaseItem<Name> {
  type: 'function';

  /**
   * Default is 'variadic-call'.
   */
  subtype?: Subtype;

  args: ESQLAstItem[];
}

export interface ESQLFunctionCallExpression extends ESQLFunction<'variadic-call'> {
  subtype: 'variadic-call';
  args: ESQLAstItem[];
}

export interface ESQLUnaryExpression extends ESQLFunction<'unary-expression'> {
  subtype: 'unary-expression';
  args: [ESQLAstItem];
}

export interface ESQLPostfixUnaryExpression extends ESQLFunction<'postfix-unary-expression'> {
  subtype: 'postfix-unary-expression';
  args: [ESQLAstItem];
}

export interface ESQLBinaryExpression
  extends ESQLFunction<'binary-expression', BinaryExpressionOperator> {
  subtype: 'binary-expression';
  args: [ESQLAstItem, ESQLAstItem];
}

export type BinaryExpressionOperator =
  | BinaryExpressionArithmeticOperator
  | BinaryExpressionAssignmentOperator
  | BinaryExpressionComparisonOperator
  | BinaryExpressionRegexOperator;

export type BinaryExpressionArithmeticOperator = '+' | '-' | '*' | '/' | '%';
export type BinaryExpressionAssignmentOperator = '=';
export type BinaryExpressionComparisonOperator = '==' | '=~' | '!=' | '<' | '<=' | '>' | '>=';
export type BinaryExpressionRegexOperator = 'like' | 'not_like' | 'rlike' | 'not_rlike';

export interface ESQLInlineCast<ValueType = ESQLAstItem> extends ESQLAstBaseItem {
  type: 'inlineCast';
  value: ValueType;
  castType: string;
}

/**
 * This node represents something the AST generator
 * didn't recognize in the ANTLR parse tree.
 *
 * It can show up if the AST generator code is out of sync
 * with the ANTLR grammar or if there is some idiosyncrasy
 * or bug in the parse tree.
 *
 * These nodes can be ignored for the purpose of validation
 * and autocomplete, but they may be helpful in detecting bugs.
 */
export interface ESQLUnknownItem extends ESQLAstBaseItem {
  type: 'unknown';
}

export interface ESQLTimeInterval extends ESQLAstBaseItem {
  type: 'timeInterval';
  unit: string;
  quantity: number;
}

export interface ESQLSource extends ESQLAstBaseItem {
  type: 'source';
  sourceType: 'index' | 'policy';

  /**
   * Represents the cluster part of the source identifier. Empty string if not
   * present.
   *
   * ```
   * FROM [<cluster>:]<index>
   * ```
   */
  cluster?: string;

  /**
   * Represents the index part of the source identifier. Unescaped and unquoted.
   *
   * ```
   * FROM [<cluster>:]<index>
   * ```
   */
  index?: string;
}

export interface ESQLColumn extends ESQLAstBaseItem {
  type: 'column';

  /**
   * An identifier can be composed of multiple parts, e.g: part1.part2.`part``3️⃣`.
   * This property contains the parsed unquoted parts of the identifier.
   * For example: `['part1', 'part2', 'part`3️⃣']`.
   */
  parts: string[];

  /**
   * @deprecated
   *
   * An identifier can be composed of multiple parts, e.g: part1.part2.`part3️⃣`
   *
   * Each part can be quoted or not quoted independently. A single `quoted`
   * property is not enough to represent the identifier. Use `parts` instead.
   */
  quoted: boolean;
}

export interface ESQLList extends ESQLAstBaseItem {
  type: 'list';
  values: ESQLLiteral[];
}

export type ESQLNumericLiteralType = 'decimal' | 'integer';

export type ESQLLiteral =
  | ESQLDecimalLiteral
  | ESQLIntegerLiteral
  | ESQLBooleanLiteral
  | ESQLNullLiteral
  | ESQLStringLiteral
  | ESQLParamLiteral<string>;

// Exporting here to prevent TypeScript error TS4058
// Return type of exported function has or is using name 'ESQLNumericLiteral' from external module
// @internal
export interface ESQLNumericLiteral<T extends ESQLNumericLiteralType> extends ESQLAstBaseItem {
  type: 'literal';
  literalType: T;
  value: number;
}
// We cast anything as decimal (e.g. 32.12) as generic decimal numeric type here
// @internal
export type ESQLDecimalLiteral = ESQLNumericLiteral<'decimal'>;

// @internal
export type ESQLIntegerLiteral = ESQLNumericLiteral<'integer'>;

// @internal
export interface ESQLBooleanLiteral extends ESQLAstBaseItem {
  type: 'literal';
  literalType: 'boolean';
  value: string;
}

// @internal
export interface ESQLNullLiteral extends ESQLAstBaseItem {
  type: 'literal';
  literalType: 'null';
  value: string;
}

// @internal
export interface ESQLStringLiteral extends ESQLAstBaseItem {
  type: 'literal';
  literalType: 'string';
  value: string;
}

// @internal
export interface ESQLParamLiteral<ParamType extends string = string> extends ESQLAstBaseItem {
  type: 'literal';
  literalType: 'param';
  paramType: ParamType;
  value: string | number;
}

/**
 * *Unnamed* parameter is not named, just a question mark "?".
 *
 * @internal
 */
export type ESQLUnnamedParamLiteral = ESQLParamLiteral<'unnamed'>;

/**
 * *Named* parameter is a question mark followed by a name "?name".
 *
 * @internal
 */
export interface ESQLNamedParamLiteral extends ESQLParamLiteral<'named'> {
  value: string;
}

/**
 * *Positional* parameter is a question mark followed by a number "?1".
 *
 * @internal
 */
export interface ESQLPositionalParamLiteral extends ESQLParamLiteral<'positional'> {
  value: number;
}

export interface ESQLMessage {
  type: 'error' | 'warning';
  text: string;
  location: ESQLLocation;
  code: string;
}

export type AstProviderFn = (text: string | undefined) =>
  | Promise<{
      ast: ESQLAst;
      errors: EditorError[];
    }>
  | { ast: ESQLAst; errors: EditorError[] };

export interface EditorError {
  startLineNumber: number;
  endLineNumber: number;
  startColumn: number;
  endColumn: number;
  message: string;
  code?: string;
  severity: 'error' | 'warning' | number;
}
