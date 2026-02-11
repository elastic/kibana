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

interface ResourceBrowserCommandArgsParams {
  sources?: ESQLSourceResult[];
  timeSeriesSources?: IndexAutocompleteItem[];
}

export const buildResourceBrowserCommandArgs = ({
  sources,
  timeSeriesSources,
}: ResourceBrowserCommandArgsParams): Record<string, string> | undefined => {
  const commandArgs: Record<string, string> = {};
  // Limit the number of items and payload size to avoid performance issues
  if (sources && sources.length <= MAX_PRELOADED_RESOURCE_ITEMS) {
    const sourcesPayload = JSON.stringify(sources);
    if (sourcesPayload.length <= MAX_PRELOADED_RESOURCE_PAYLOAD) {
      commandArgs.sources = sourcesPayload;
    }
  }

  if (timeSeriesSources && timeSeriesSources.length <= MAX_PRELOADED_RESOURCE_ITEMS) {
    const timeSeriesPayload = JSON.stringify(timeSeriesSources);
    if (timeSeriesPayload.length <= MAX_PRELOADED_RESOURCE_PAYLOAD) {
      commandArgs.timeSeriesSources = timeSeriesPayload;
    }
  }

  return Object.keys(commandArgs).length ? commandArgs : undefined;
};

interface FieldsBrowserCommandArgsParams {
  fields?: string[];
}

/**
 * Builds the (optional) command payload for the "Browse fields" autocomplete item.
 *
 * The payload is a JSON-encoded list of suggested fields used to filter the fields browser list.
 * This is not a pre-selection — the fields browser always opens with no selected field.
 */
export const buildFieldsBrowserCommandArgs = ({
  fields,
}: FieldsBrowserCommandArgsParams): Record<string, string> | undefined => {
  if (!fields?.length) return undefined;
  if (fields.length > MAX_PRELOADED_RESOURCE_ITEMS) return undefined;

  const payload = JSON.stringify(fields);
  if (payload.length > MAX_PRELOADED_RESOURCE_PAYLOAD) return undefined;

  return { fields: payload };
};
