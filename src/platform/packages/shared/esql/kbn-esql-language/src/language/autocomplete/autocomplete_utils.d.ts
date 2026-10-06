/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ESQLSourceResult, IndexAutocompleteItem } from '@kbn/esql-types';
interface ResourceBrowserCommandArgsParams {
  sources?: ESQLSourceResult[];
  timeSeriesSources?: IndexAutocompleteItem[];
}
export declare const buildResourceBrowserCommandArgs: ({
  sources,
  timeSeriesSources,
}: ResourceBrowserCommandArgsParams) => Record<string, string> | undefined;
export interface PreloadedFieldItem {
  name: string;
  type?: string;
}
interface FieldsBrowserCommandArgsParams {
  /** Suggested fields (name + optional type) used to preload the fields browser list. */
  fields?: PreloadedFieldItem[];
}
/**
 * Builds the (optional) command payload for the "Browse fields" autocomplete item.
 *
 * The payload is a JSON-encoded list of suggested fields (name and type) used to preload the
 * fields browser list. This is not a pre-selection — the fields browser always opens with
 * no selected field.
 */
export declare const buildFieldsBrowserCommandArgs: ({
  fields,
}: FieldsBrowserCommandArgsParams) => Record<string, string> | undefined;
export {};
