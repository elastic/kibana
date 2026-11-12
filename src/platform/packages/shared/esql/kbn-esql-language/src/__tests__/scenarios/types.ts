/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { LicenseType } from '@kbn/licensing-types';
import type { PricingProduct } from '@kbn/core-pricing-common/src/types';
import type {
  ESQLCallbacks,
  ESQLFieldWithMetadata,
  ESQLSourceResult,
  IndexAutocompleteItem,
  InferenceEndpointAutocompleteItem,
  RecommendedField,
  RecommendedQuery,
} from '@kbn/esql-types';
import type { ISuggestionItem } from '../../commands/registry/types';

/** The package entry point under test: the only function a scenario goes through. */
export type SuggestFunction = (
  fullText: string,
  offset: number,
  callbacks?: ESQLCallbacks
) => Promise<ISuggestionItem[]>;

/** An autocomplete flow the scenario tables run against. */
export interface SuggestFlow {
  readonly name: string;
  readonly suggest: SuggestFunction;
  /** Rows tagged `new` describe behaviour only these flows have. */
  readonly runsNewRows: boolean;
}

export interface ScenarioPolicy {
  readonly name: string;
  readonly sourceIndices: string[];
  readonly matchField: string;
  readonly enrichFields: string[];
}

/** Everything the editor would answer through callbacks while a scenario runs. */
export interface ScenarioWorld {
  readonly columns: readonly ESQLFieldWithMetadata[];
  readonly sources: readonly ESQLSourceResult[];
  readonly policies: readonly ScenarioPolicy[];
  readonly joinIndices: readonly IndexAutocompleteItem[];
  readonly timeseriesIndices: readonly IndexAutocompleteItem[];
  readonly inferenceEndpoints: readonly InferenceEndpointAutocompleteItem[];
  readonly recommendedQueries: readonly RecommendedQuery[];
  readonly recommendedFields: readonly RecommendedField[];
  readonly histogramBarTarget: number;
  readonly license: LicenseType;
  readonly activeProduct?: PricingProduct;
  readonly isServerless: boolean;
}

/** A suggestion expected by its text, optionally with more item properties to match. */
export type ExpectedSuggestion = string | (Partial<ISuggestionItem> & { text: string });

export interface ScenarioExpectation {
  /** The suggestions are exactly these, in any order. */
  readonly exact?: readonly ExpectedSuggestion[];
  /** These suggestions are present. */
  readonly contains?: readonly ExpectedSuggestion[];
  /** No suggestion has one of these texts. */
  readonly excludes?: readonly string[];
}

export interface Scenario {
  /** Groups rows under one heading in the test output. */
  readonly group?: string;
  readonly name: string;
  /** Text before the cursor. */
  readonly query: string;
  /** Text after the cursor. */
  readonly after?: string;
  /** Overrides of the default world. */
  readonly world?: Partial<ScenarioWorld>;
  /** `new` marks a deliberate behaviour change that the current flow does not have. */
  readonly status?: 'new';
  readonly expect: ScenarioExpectation;
}

export interface ScenarioTable {
  readonly command: string;
  readonly scenarios: readonly Scenario[];
}
