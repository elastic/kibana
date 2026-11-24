/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { Adapters, Request } from '@kbn/inspector-plugin/public';
import { disambiguateRequestNames } from '@kbn/inspector-plugin/public';
import { isRecord } from './shared/json_helpers';

/**
 * True when an inspector request is the body logged for an ES|QL search. SQL also logs a string
 * `query`, but only ES|QL always has the `include_execution_metadata` key, with no value when the
 * caller did not set it, so the key is what is looked for and not its value.
 */
const isEsqlInspectorRequest = (request: Request): boolean => {
  const json = request.json;
  return isRecord(json) && typeof json.query === 'string' && 'include_execution_metadata' in json;
};

/**
 * ES|QL requests on an inspector adapter, in the order they were logged. Their names are the ones
 * the Requests view shows, so a request is called the same in both.
 */
export const listEsqlInspectorRequests = (adapters: Adapters): Request[] =>
  disambiguateRequestNames(adapters.requests?.getRequests() ?? []).filter(isEsqlInspectorRequest);

/** Inspector views use this to appear only when an ES|QL request was logged. */
export const hasEsqlInspectorRequest = (adapters: Adapters): boolean =>
  listEsqlInspectorRequests(adapters).length > 0;
