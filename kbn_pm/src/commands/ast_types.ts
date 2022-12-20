/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

function isObj(val: unknown): val is Record<string, unknown> {
  return typeof val === 'object' && val !== null;
}

export enum Token {
  ILLEGAL,
  EOF,

  NEWLINE,
  INDENT,
  OUTDENT,

  // Tokens with values
  IDENT, // x
  INT, // 123
  FLOAT, // 1.23e45
  STRING, // "foo" or 'foo' or '''foo''' or r'foo' or r"foo"
  BYTES, // b"foo", etc

  // Punctuation
  PLUS, // +
  MINUS, // -
  STAR, // *
  SLASH, // /
  SLASHSLASH, // //
  PERCENT, // %
  AMP, // &
  PIPE, // |
  CIRCUMFLEX, // ^
  LTLT, // <<
  GTGT, // >>
  TILDE, // ~
  DOT, // .
  COMMA, // ,
  EQ, // =
  SEMI, // ;
  COLON, // :
  LPAREN, // (
  RPAREN, // )
  LBRACK, // [
  RBRACK, // ]
  LBRACE, // {
  RBRACE, // }
  LT, // <
  GT, // >
  GE, // >=
  LE, // <=
  EQL, // ==
  NEQ, // !=
  PLUS_EQ, // +=    (keep order consistent with PLUS..GTGT)
  MINUS_EQ, // -=
  STAR_EQ, // *=
  SLASH_EQ, // /=
  SLASHSLASH_EQ, // //=
  PERCENT_EQ, // %=
  AMP_EQ, // &=
  PIPE_EQ, // |=
  CIRCUMFLEX_EQ, // ^=
  LTLT_EQ, // <<=
  GTGT_EQ, // >>=
  STARSTAR, // **

  // Keywords
  AND,
  BREAK,
  CONTINUE,
  DEF,
  ELIF,
  ELSE,
  FOR,
  IF,
  IN,
  LAMBDA,
  LOAD,
  NOT,
  NOT_IN, // synthesized by parser from NOT IN
  OR,
  PASS,
  RETURN,
  WHILE,

  maxToken,
}

/**
 * A Position describes the location of a rune of input.
 */
export interface Position {
  Line: number; // 1-based line number; 0 if line unknown
  Col: number; // 1-based column (rune) number; 0 if column unknown
}

/**
 * A BinaryExpr represents a binary expression: X Op Y.
 *
 * As a special case, BinaryExpr{Op:EQ} may also represent
 * a named argument in a call f(k=v) or a named parameter
 * in a function declaration def f(param=default).
 */
export interface BinaryExpr<_X extends Expr = Expr, _Y extends Expr = Expr> {
  X: _X;
  OpPos: Position;
  Op: Token;
  Y: _Y;
}
export function isBinaryExpr(e: Expr): e is BinaryExpr {
  return 'X' in e && 'OpPos' in e && 'Op' in e && 'Y' in e;
}

/**
 * A CallExpr represents a function call expression: Fn(Args).
 */
export interface CallExpr {
  Fn: Expr;
  Lparen: Position;
  Args: Expr[];
  Rparen: Position;
}
export function isCallExpr(e: Expr): e is CallExpr {
  return 'Fn' in e;
}

/**
 * A Comprehension represents a list or dict comprehension:
 * [Body for ... if ...] or {Body for ... if ...}
 */
export interface Comprehension {
  Curly: boolean; // {x:y for ...} or {x for ...}, not [x for ...]
  Lbrack: Position;
  Body: Expr;
  Clauses: unknown[]; // = *ForClause | *IfClause
  Rbrack: Position;
}
export function isComprehension(e: Expr): e is Comprehension {
  return 'Curly' in e;
}

/**
 * CondExpr represents the conditional: X if COND else ELSE.
 */
export interface CondExpr {
  If: Position;
  Cond: Expr;
  True: Expr;
  ElsePos: Position;
  False: Expr;
}
export function isCondExpr(e: Expr): e is CondExpr {
  return 'If' in e && 'Cond' in e;
}

/**
 * A DictEntry represents a dictionary entry: Key: Value.
 * Used only within a DictExpr.
 */
export interface DictEntry {
  Key: Expr;
  Colon: Position;
  Value: Expr;
}
export function isDictEntry(e: Expr): e is DictEntry {
  return 'Key' in e && 'Colon' in e;
}

/**
 * A DictExpr represents a dictionary literal: { List }.
 */
export interface DictExpr {
  Lbrace: Position;
  List: DictEntry[];
  Rbrace: Position;
}
export function isDictExpr(e: Expr): e is DictExpr {
  return 'Lbrace' in e && 'List' in e && 'Rbrace' in e;
}

/**
 * A DotExpr represents a field or method selector: X.Name.
 */
export interface DotExpr {
  X: Expr;
  Dot: Position;
  NamePos: Position;
  Name: Ident;
}
export function isDotExpr(e: Expr): e is DotExpr {
  return 'X' in e && 'Dot' in e;
}

/**
 * An Ident represents an identifier.
 */
export interface Ident {
  NamePos: Position;
  Name: string;
}
export function isIdent(e: Expr): e is Ident {
  return 'Name' in e && 'NamePos' in e && !('Dot' in e);
}

/**
 * An IndexExpr represents an index expression: X[Y].
 */
export interface IndexExpr {
  X: Expr;
  Lbrack: Position;
  Y: Expr;
  Rbrack: Position;
}
export function isIndexExpr(e: Expr): e is IndexExpr {
  return 'X' in e && 'Y' in e && 'Lbrack' in e && 'Rbrack' in e;
}

/**
 * A LambdaExpr represents an inline function abstraction.
 */
export interface LambdaExpr {
  Lambda: Position;
  Params: Expr[]; // param = ident | ident=expr | * | *ident | **ident
  Body: Expr;
}
export function isLambdaExpr(e: Expr): e is LambdaExpr {
  return 'Lambda' in e;
}

/**
 * A ListExpr represents a list literal: [ List ].
 */
export interface ListExpr {
  Lbrack: Position;
  List: Expr[];
  Rbrack: Position;
}
export function isListExpr(e: Expr): e is ListExpr {
  return 'Lbrack' in e && 'List' in e && 'Rbrack' in e;
}

/**
 * A Literal represents a literal string or number.
 */
export interface Literal {
  Token: Token; // = STRING | BYTES | INT | FLOAT
  TokenPos: Position;
  Raw: string; // uninterpreted text
  Value: string | number;
}
export function isLiteral(e: Expr): e is Literal {
  return 'Token' in e && 'TokenPos' in e && 'Raw' in e;
}

/**
 * A ParenExpr represents a parenthesized expression: (X).
 */
export interface ParenExpr {
  Lparen: Position;
  X: Expr;
  Rparen: Position;
}
export function isParenExpr(e: Expr): e is ParenExpr {
  return 'Lparen' in e && 'X' in e && 'Rparen' in e;
}

/**
 * A SliceExpr represents a slice or substring expression: X[Lo:Hi:Step].
 */
export interface SliceExpr {
  X: Expr;
  Lbrack: Position;
  Lo: Expr;
  Hi: Expr;
  Step: Expr;
  Rbrack: Position;
}
export function isSliceExpr(e: Expr): e is SliceExpr {
  return 'Lbrack' in e && 'Lo' in e && 'Hi' in e;
}

/**
 * A TupleExpr represents a tuple literal: (List).
 */
export interface TupleExpr {
  Lparen: Position; // optional (e.g. in x, y = 0, 1), but required if List is empty
  List: Expr[];
  Rparen: Position;
}
export function isTupleExpr(e: Expr): e is TupleExpr {
  return 'Lparen' in e && 'List' in e;
}

/**
 * A UnaryExpr represents a unary expression: Op X.
 *
 * As a special case, UnaryOp{Op:Star} may also represent
 * the star parameter in def f(*args) or def f(*, x).
 */
export interface UnaryExpr {
  OpPos: Position;
  Op: Token;
  X: Expr; // may be nil if Op==STAR
}
export function isUnaryExpr(e: Expr): e is UnaryExpr {
  return 'Op' in e && 'X' in e && !('Y' in e);
}

/**
 * An Expr is a Starlark expression.
 */
export type Expr =
  | BinaryExpr
  | CallExpr
  | Comprehension
  | CondExpr
  | DictEntry
  | DictExpr
  | DotExpr
  | Ident
  | IndexExpr
  | LambdaExpr
  | ListExpr
  | Literal
  | ParenExpr
  | SliceExpr
  | TupleExpr
  | UnaryExpr;

/**
 * An AssignStmt represents an assignment:
 *  x = 0
 *  x, y = y, x
 *  x += 1
 */
export interface AssignStmt<_LHS extends Expr = Expr, _RHS extends Expr = Expr> {
  OpPos: Position;
  Op: Token; // = EQ | {PLUS,MINUS,STAR,PERCENT}_EQ
  RHS: _RHS;
  LHS: _LHS;
}
export function isAssignStmt(s: Stmt): s is AssignStmt {
  return 'Op' in s && 'LHS' in s && 'RHS' in s;
}

/**
 * A BranchStmt changes the flow of control: break, continue, pass.
 */
export interface BranchStmt {
  Token: Token.BREAK | Token.CONTINUE | Token.PASS;
  TokenPos: Position;
}
export function isBranchStmt(s: Stmt): s is BranchStmt {
  return (
    'Token' in s &&
    (s.Token === Token.BREAK || s.Token === Token.CONTINUE || s.Token === Token.PASS)
  );
}

/**
 * A DefStmt represents a function definition.
 */
export interface DefStmt {
  Def: Position;
  Name: Ident;
  Params: Expr[]; // param = ident | ident=expr | * | *ident | **ident
  Body: Stmt[];
  Function: unknown;
}
export function isDefStmt(s: Stmt): s is DefStmt {
  return 'Def' in s;
}

/**
 * An ExprStmt is an expression evaluated for side effects.
 */
export interface ExprStmt<Ex extends Expr = Expr> {
  X: Ex;
}
export function isExprStmt(s: Stmt): s is ExprStmt {
  return 'X' in s && !('For' in s);
}

/**
 * A ForStmt represents a loop: for Vars in X: Body.
 */
export interface ForStmt {
  For: Position;
  Vars: Expr; // name, or tuple of names
  X: Expr;
  Body: Stmt[];
}
export function isForStmt(s: Stmt): s is ForStmt {
  return 'For' in s;
}

/**
 * A WhileStmt represents a while loop: while X: Body.
 */
export interface WhileStmt {
  While: Position;
  Cond: Expr;
  Body: Stmt[];
}
export function isWhileStmt(s: Stmt): s is WhileStmt {
  return 'While' in s;
}

/**
 * An IfStmt is a conditional: If Cond: True; else: False.
 * 'elseif' is desugared into a chain of IfStmts.
 */
export interface IfStmt {
  If: Position; // IF or ELIF
  Cond: Expr;
  True: Stmt[];
  ElsePos: Position; // ELSE or ELIF
  False: Stmt[]; // optional
}
export function isIfStmt(s: Stmt): s is IfStmt {
  return 'If' in s;
}

/**
 * A LoadStmt loads another module and binds names from it:
 *  load(Module, "x", y="foo").
 *
 * The AST is slightly unfaithful to the concrete syntax here because
 * Starlark's load statement, so that it can be implemented in Python,
 * binds some names (like y above) with an identifier and some (like x)
 * without.  For consistency we create fake identifiers for all the
 * strings.
 */
export interface LoadStmt {
  Load: Position;
  Module: Literal; // a string
  From: Ident[]; // name defined in loading module
  To: Ident[]; // name in loaded module
  Rparen: Position;
}
export function isLoadStmt(s: Stmt): s is LoadStmt {
  return 'Load' in s;
}

/**
 * A ReturnStmt returns from a function.
 */
export interface ReturnStmt {
  Return: Position;
  Result: Expr; // may be nil
}
export function isReturnStmt(s: Stmt): s is ReturnStmt {
  return 'Return' in s;
}

/**
 * A Stmt is a Starlark statement.
 */
export type Stmt =
  | AssignStmt
  | BranchStmt
  | DefStmt
  | ExprStmt
  | ForStmt
  | WhileStmt
  | IfStmt
  | LoadStmt
  | ReturnStmt;

export interface File {
  Path: string;
  Stmts: Stmt[];
}

export function isFile(node: unknown): node is File {
  return isObj(node) && typeof node.Path === 'string' && Array.isArray(node.Stmts);
}
