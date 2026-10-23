/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { HttpSetup } from '@kbn/core/public';
import type { KibanaDynamicValueSource } from '../../../common/constants';
import { KIBANA_DYNAMIC_VALUE_SOURCES } from '../../../common/constants';
import { isRecord } from '../../../common/utils/record_utils';
import type { ResultTerm } from '../autocomplete/types';

interface ValueSource {
  path: string;
  query?: Record<string, string | number>;
  version?: string;
  // maps the API response to the list of resources, each with an id and an optional name
  toResources: (response: unknown) => unknown[];
}

const toArray = (value: unknown): unknown[] => (Array.isArray(value) ? value : []);

const VALUE_SOURCES: Record<KibanaDynamicValueSource, ValueSource> = {
  space: { path: '/api/spaces/space', toResources: toArray },
  connector: { path: '/api/actions/connectors', toResources: toArray },
  data_view: {
    path: '/api/data_views',
    version: '2023-10-31',
    toResources: (response) => (isRecord(response) ? toArray(response.data_view) : []),
  },
  rule: {
    path: '/api/alerting/rules/_find',
    query: { per_page: 100, fields: 'name' },
    toResources: (response) => (isRecord(response) ? toArray(response.data) : []),
  },
};

const toTerms = (resources: unknown[]): ResultTerm[] =>
  resources.flatMap((resource) => {
    if (!isRecord(resource) || typeof resource.id !== 'string') {
      return [];
    }
    const { id, name } = resource;
    return [{ name: id, ...(typeof name === 'string' && { meta: name }) }];
  });

const REFRESH_INTERVAL_MS = 30000;

/**
 * Provides the cluster specific values of Kibana API path params. Values are loaded in the
 * background, so a source is empty until its first request completes; they are refreshed
 * when they are requested after `REFRESH_INTERVAL_MS`.
 */
export class KibanaValuesProvider {
  private readonly terms = new Map<KibanaDynamicValueSource, ResultTerm[]>();
  private readonly lastRequested = new Map<KibanaDynamicValueSource, number>();

  constructor(private readonly http: HttpSetup, private readonly now: () => number = Date.now) {}

  /** Starts loading all the sources, so that their values are there once the user needs them. */
  prefetch() {
    KIBANA_DYNAMIC_VALUE_SOURCES.forEach((source) => this.refreshIfStale(source));
  }

  getTerms(source: KibanaDynamicValueSource): ResultTerm[] {
    this.refreshIfStale(source);
    return this.terms.get(source) ?? [];
  }

  private refreshIfStale(source: KibanaDynamicValueSource) {
    const lastRequested = this.lastRequested.get(source);
    if (lastRequested !== undefined && this.now() - lastRequested < REFRESH_INTERVAL_MS) {
      return;
    }
    // set before the request completes, so failures (for example missing privileges) are
    // retried at the same pace instead of on every keystroke
    this.lastRequested.set(source, this.now());
    this.load(source);
  }

  private async load(source: KibanaDynamicValueSource) {
    const { path, query, version, toResources } = VALUE_SOURCES[source];
    try {
      const response: unknown = await this.http.get(path, { query, version });
      this.terms.set(source, toTerms(toResources(response)));
    } catch {
      // keep the values loaded before, the user can still type any value
    }
  }
}
