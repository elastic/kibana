/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ESQLSourceResult, IndexAutocompleteItem } from '@kbn/esql-types';
import { MAX_PRELOADED_RESOURCE_ITEMS, MAX_PRELOADED_RESOURCE_PAYLOAD } from '../../constants';

const buildJsonCommandArg = <T>({
  key,
  value,
}: {
  key: string;
  value: T[] | undefined;
}): Record<string, string> | undefined => {
  if (!value?.length) return undefined;
  // Limit the number of items and payload size to avoid performance issues
  if (value.length > MAX_PRELOADED_RESOURCE_ITEMS) return undefined;

  const payload = JSON.stringify(value);
  if (payload.length > MAX_PRELOADED_RESOURCE_PAYLOAD) return undefined;

  return { [key]: payload };
};

interface ResourceBrowserCommandArgsParams {
  sources?: ESQLSourceResult[];
  timeSeriesSources?: IndexAutocompleteItem[];
}

export const buildResourceBrowserCommandArgs = ({
  sources,
  timeSeriesSources,
}: ResourceBrowserCommandArgsParams): Record<string, string> | undefined => {
  const commandArgs = {
    ...buildJsonCommandArg({ key: 'sources', value: sources }),
    ...buildJsonCommandArg({ key: 'timeSeriesSources', value: timeSeriesSources }),
  };

  return Object.keys(commandArgs).length ? commandArgs : undefined;
};

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
export const buildFieldsBrowserCommandArgs = ({
  fields,
}: FieldsBrowserCommandArgsParams): Record<string, string> | undefined => {
  return buildJsonCommandArg({ key: 'fields', value: fields });
};
