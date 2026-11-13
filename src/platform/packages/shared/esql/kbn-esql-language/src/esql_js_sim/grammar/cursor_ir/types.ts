/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/**
 * What a token is in the grammar, whatever command it belongs to.
 *
 * - `keyword`: a word with a fixed text that structures a command, as `BY` or `ASC`.
 * - `operator`: a symbol, or a word inside an expression, that combines values, as `==` or `AND`.
 * - `separator`: separates the items of a list, as `,`.
 * - `opener` and `closer`: a bracket of any kind.
 * - `pipe`: starts the next command.
 * - `terminator`: ends a header statement, as `;`.
 * - `value`: a token with no fixed text, as a name, a number or a string.
 * - `end`: the end of the query.
 */
export type TokenClass =
  | 'keyword'
  | 'operator'
  | 'separator'
  | 'opener'
  | 'closer'
  | 'pipe'
  | 'terminator'
  | 'value'
  | 'end';

/**
 * Where the cursor is.
 *
 * - `inside_comment`, `inside_string`: nothing of the grammar applies.
 * - `invalid`: the grammar accepts nothing here.
 * - `start_of_query`: nothing is typed before the cursor.
 * - `start_of_statement`: a header statement ended; another one or the query can start.
 * - `start_of_command`: a command name is expected, after a pipe or at the start of a branch.
 * - `inside_argument`: the grammar only allows the argument before the cursor to go on, as
 *   after the dot of `a.`.
 * - `after_argument`: a value or a closing bracket comes before the cursor.
 * - `start_of_argument`: anything else: after a keyword, a separator, an operator or an
 *   opening bracket.
 */
export type CursorPosition =
  | 'inside_comment'
  | 'inside_string'
  | 'invalid'
  | 'start_of_query'
  | 'start_of_statement'
  | 'start_of_command'
  | 'inside_argument'
  | 'after_argument'
  | 'start_of_argument';

/**
 * The id of a place in the grammar where a rule calls another rule or takes a token:
 * `rule.label` when the grammar labels the call (`renameClause.newName`), `rule>called`
 * otherwise (`keepCommand>qualifiedNamePatterns`, `metadata>UNQUOTED_SOURCE`).
 */
export type CallSiteId = string;

/** An argument the grammar expects at the cursor. */
export interface ExpectedArgument {
  /** The call site of the argument itself, the last of `path`. */
  id: CallSiteId;
  /** The rule the argument is, e.g. `qualifiedName`, `constant` or `functionName`. */
  rule: string;
  /** The call sites from the command down to the argument, outermost first. */
  path: CallSiteId[];
  /** The rule of the command the argument is in, e.g. `whereCommand`. */
  command?: string;
  /** The argument started before the cursor, which would extend it. */
  continues: boolean;
}

/** A token the grammar expects at the cursor. */
export interface Follower {
  /** The grammar name of the token, e.g. `BY`. */
  token: string;
  class: TokenClass;
  /** The fixed text of the token, e.g. `by`; absent for a `value`. */
  text?: string;
  /** The place that takes the token, e.g. `limitByGroupKey>BY`; absent when the command ends. */
  id?: CallSiteId;
  /** The call sites from the command down to the rule that takes the token, outermost first. */
  path: CallSiteId[];
  /** The rule of the command the token is in, or the one it starts. */
  command?: string;
  /** The token is the name of a command. */
  startsCommand: boolean;
}

/** A place above a written argument: the call site, and which of its repetitions this one is. */
export interface WrittenAncestor {
  id: CallSiteId;
  /** The position among the siblings with the same call site, as the items of a list. */
  index: number;
  start: number;
  end: number;
  /** Set by `locate`: the cursor is inside it, so what is typed next belongs to it. */
  open?: boolean;
}

/** An argument or a token that is written in a command. */
export interface WrittenArgument {
  /** The call site that takes it, as in `ExpectedArgument.id` and `Follower.id`. */
  id: CallSiteId;
  kind: 'rule' | 'token';
  /** For a rule: the rule, e.g. `qualifiedName`. */
  rule?: string;
  /** For a token: its grammar name and its class. */
  token?: string;
  class?: TokenClass;
  text: string;
  start: number;
  end: number;
  /** The position among the siblings with the same call site, as the items of a list. */
  index: number;
  /** The call sites from the command down to it, outermost first. */
  ancestors: WrittenAncestor[];
  /** The parser read it without an error. */
  complete: boolean;
  /** Set by `locate`: it is the argument the cursor is in, written only in part. */
  open?: boolean;
}

/** A command of a query with what is written in it. */
export interface WrittenCommand {
  /** The rule of the command, e.g. `whereCommand`. */
  rule: string;
  start: number;
  end: number;
  /** The rules of the commands around it, outermost first. */
  enclosingCommands: string[];
  /** In the order written. The arguments of a nested command belong to that command. */
  arguments: WrittenArgument[];
}

/** The last token before the cursor, or before the word being typed. */
export interface PreviousToken {
  token: string;
  /** Read from the token's text alone: a word is a `keyword` here, also inside an expression. */
  class: TokenClass;
  /** Nothing separates the token from the cursor or the word. */
  glued: boolean;
}

/** What the text of a word looks like, whatever the grammar expects there. */
export type WordKind = 'name' | 'quoted_name' | 'pattern' | 'number' | 'string';

/** The word being typed. The position and the expectations describe the place before it. */
export interface TypedWord {
  text: string;
  start: number;
  kind: WordKind;
  /** The lexer reads the word as one whole token, as a closed string or a name. */
  complete: boolean;
  /** The expected token the word spells in full, e.g. `BY` for `by`. */
  keyword?: string;
  /**
   * The whole argument typed so far when the word continues one, e.g. `a.b` for the word `b`
   * or `cluster:index` for `index`.
   */
  argument?: { text: string; start: number };
}

/** The first token after the cursor, or after the word being typed. */
export interface NextToken {
  token: string;
  /** Read from the token's text alone, as for the previous token. */
  class: TokenClass;
}

/** What the grammar says about the cursor, in terms that hold for every command. */
export interface CursorIR {
  position: CursorPosition;
  /** The rule of the innermost command around the cursor, e.g. `whereCommand`. */
  command?: string;
  /** The rules of the commands around that command, outermost first, as `forkCommand`. */
  enclosingCommands: string[];
  /** The innermost command's text up to the cursor. */
  segment: { start: number; end: number; text: string };
  previous?: PreviousToken;
  arguments: ExpectedArgument[];
  followers: Follower[];
  /** The command is complete at the cursor. */
  canEnd: boolean;
  /** The only token that can come next, when nothing else can. */
  onlyFollower?: string;
  word?: TypedWord;
  next?: NextToken;
  /**
   * What is written in the innermost command before the cursor or the word being typed. The
   * argument the cursor is in, if it has text before the cursor, comes last and is `open`.
   */
  written: WrittenArgument[];
}
