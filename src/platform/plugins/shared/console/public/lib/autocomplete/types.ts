/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { MonacoEditorActionsProvider } from '../../application/containers/editor/monaco_editor_actions_provider';
import type { CoreEditor, Range, Token } from '../../types';
import type { AutocompleteComponent } from './components';

export interface ResultTerm {
  meta?: string;
  context?: AutoCompleteContext;
  insertValue?: string;
  name?: string | boolean;
  value?: string;
  score?: number;
  /**
   * Template payload used when inserting an autocomplete suggestion into the editor.
   *
   * This value originates from the Console autocomplete DSL (`__template` / `__one_of` / `__any_of`)
   * and is passed through largely unvalidated. Consumers treat it as an opaque payload with a
   * single structured special-case (`__raw`); otherwise it is `JSON.stringify`'d.
   *
   * Note: the compiler only checks `template !== undefined` before assigning to `ResultTerm.template`,
   * so other values (including `null`) can flow through unchanged. This is also why editors/LSP may
   * show the type as `{}` | `null` at some use sites (unknown-but-not-undefined). Note that
   * TypeScript’s `{}` here is the “any non-nullish value” top type (not a literal empty object),
   * and the runtime values are not guaranteed to be objects.
   *
   * Common shapes produced by the compiler include:
   * - a string
   * - an array (e.g. `[]` or a single nested template wrapped as `[template]`)
   * - a plain object to be `JSON.stringify`'d
   * - the special raw wrapper `{ __raw: true, value: string }` to bypass JSON stringification
   *
   * Because the DSL payload is not validated, other primitives (e.g. `null`, `number`, `boolean`)
   * can also flow through unchanged.
   */
  template?: unknown;
}

export interface DataAutoCompleteRulesOneOf {
  __condition?: {
    lines_regex: string;
  };
  __template: Record<string, unknown>;
  [key: string]: unknown;
}

export interface AutoCompleteContext {
  /**
   * Autocomplete context is dynamically extended at runtime with component-specific keys while
   * resolving/matching DSL rules (for example: `context.indices`, `context.types`, and other
   * keys derived from component names / endpoint rules).
   *
   * This index signature documents that design: callers should treat these dynamic properties as
   * untyped unless a specific field is declared below.
   */
  [key: string]: unknown;
  autoCompleteSet?: null | ResultTerm[];
  /**
   * Stores a state for async results, e.g. fields suggestions based on the mappings definition.
   */
  asyncResultsState?: {
    isLoading: boolean;
    lastFetched: number | null;
    results: Promise<ResultTerm[]>;
  };
  endpoint?: null | {
    paramsAutocomplete: {
      getTopLevelComponents: (method?: string | null) => AutocompleteComponent[];
    };
    bodyAutocompleteRootComponents: AutocompleteComponent[];
    id?: string;
    documentation?: string;
    data_autocomplete_rules?: Record<string, unknown> | null;
  };
  urlPath?: null | unknown;
  urlParamsTokenPath?: Array<Record<string, string>> | null;
  method?: string | null;
  token?: Token;
  activeScheme?: unknown;
  replacingToken?: boolean;
  rangeToReplace?: Range;
  autoCompleteType?: null | string;
  editor?: CoreEditor | MonacoEditorActionsProvider;

  /**
   * The tokenized user input that prompted the current autocomplete at the cursor. This can be out of sync with
   * the input that is currently being displayed in the editor.
   */
  createdWithToken?: Token | null;

  /**
   * The tokenized user input that is currently being displayed at the cursor in the editor when the user accepted
   * the autocomplete suggestion.
   */
  updatedForToken?: Token | null;

  addTemplate?: unknown;
  prefixToAdd?: string;
  suffixToAdd?: string;
  textBoxPosition?: { lineNumber: number; column: number };
  urlTokenPath?: string[];
  otherTokenValues?: string | string[];
  requestStartRow?: number | null;
  bodyTokenPath?: string[] | null;
  endpointComponentResolver?: unknown;
  globalComponentResolver?: unknown;
  documentation?: string;
}
