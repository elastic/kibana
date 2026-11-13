/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ESQLCallbacks } from '@kbn/esql-types';
import type { LicenseType } from '@kbn/licensing-types';
import type { PricingProduct } from '@kbn/core-pricing-common/src/types';
import type { ICommand } from '../../commands/registry/registry';
import type { GetColumnsByTypeFn } from '../../commands/registry/types';
import type { ResolvedRole } from '../../esql_js_sim/definitions';
import type { CursorIR, ExpectedArgument, Follower } from '../../esql_js_sim/grammar';

/**
 * What the engine has to offer at the cursor, before anything is fetched or shown. A request
 * names a kind of thing, never a command.
 */
export type SuggestionRequest =
  /** The names of the commands that can start here, by the grammar rule of each. */
  | { kind: 'command_names'; commandRules: string[] }
  /** A token with a fixed text: a keyword, a pipe, a separator. */
  | { kind: 'token'; follower: Follower }
  /** The end of the command: the next line. */
  | { kind: 'end_of_command' }
  /** An argument, with the role its signature gives it. */
  | { kind: 'argument'; argument: ExpectedArgument; resolved?: ResolvedRole };

/** What providers know beyond the request: the editor, and the query before the cursor. */
export interface SuggestionContext {
  callbacks: ESQLCallbacks | undefined;
  /** The cursor, as the grammar describes it. */
  ir: CursorIR;
  /**
   * The cursor as it would be after a name typed here and a space. It tells what has to
   * follow an argument, and so whether the item for it should move the cursor on.
   */
  afterName: CursorIR;
  /**
   * The columns the command at the cursor can read, as items. They are computed from the
   * commands before it, and only when a provider asks.
   */
  getColumnsByType: GetColumnsByTypeFn;
  /** Every name written in the query, to pick a new one that is not taken. */
  usedNames: Set<string>;
  /** Whether the license reaches a level; undefined when the editor does not say. */
  hasLicense: ((license: LicenseType) => boolean) | undefined;
  activeProduct: PricingProduct | undefined;
  /** The registered commands written before the cursor in this pipeline and in the header. */
  precedingCommands: ICommand[];
  /** The pipeline reads a time-series source. */
  sourceIsTimeSeries: boolean;
  /** The query has a subquery somewhere before the cursor. */
  queryContainsSubqueries: boolean;
}
