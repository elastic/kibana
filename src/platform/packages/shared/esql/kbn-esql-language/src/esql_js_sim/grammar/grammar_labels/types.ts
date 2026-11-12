/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/** In `precededBy`: the call can be the first thing in its rule. */
export const RULE_START = '<start>';
/** In `followedBy`: the call can be the last thing in its rule. */
export const RULE_END = '<end>';

/** A labelled rule call in the grammar, e.g. `oldName=qualifiedNamePattern` in `renameClause`. */
export interface GrammarLabel {
  /** The rule the call is in, e.g. `renameClause`. */
  rule: string;
  /** The label, e.g. `oldName`. */
  label: string;
  /** The rule called, e.g. `qualifiedNamePattern`. */
  invokes: string;
  /** The ATN state of the call. */
  state: number;
  /**
   * Token names, `<rule>` calls, or `<start>` (the start of `rule`) that can come right
   * before the call.
   */
  precededBy: string[];
  /** Token names, `<rule>` calls, or `<end>` (the end of `rule`) that can come right after it. */
  followedBy: string[];
}

/** A rule call in the grammar, with its label when it has one. */
export type CallSite = Omit<GrammarLabel, 'label'> & { label?: string };
