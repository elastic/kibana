/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { HttpStart } from '@kbn/core/public';
import type { JsonValue } from '@kbn/utility-types';

export interface EsSpecResponse {
  es?: {
    endpoints?: Record<string, unknown>;
  };
}

export type ProcessorSuggestion = { name: string; template?: JsonValue };

export class ConsoleSpecClient {
  private esSpecCache?: EsSpecResponse;
  private esSpecPromise?: Promise<EsSpecResponse>;

  constructor(private readonly http: HttpStart) {}

  public getEsSpec() {
    if (this.esSpecCache) {
      return Promise.resolve(this.esSpecCache);
    }
    if (this.esSpecPromise) {
      return this.esSpecPromise;
    }
    this.esSpecPromise = this.http
      .get<EsSpecResponse>('/api/console/api_server')
      .then((res) => {
        this.esSpecCache = res;
        this.esSpecPromise = undefined;
        return res;
      })
      .catch((err) => {
        this.esSpecPromise = undefined;
        throw err;
      });
    return this.esSpecPromise;
  }

  public async getIngestProcessorSuggestions(): Promise<ProcessorSuggestion[]> {
    const res = await this.getEsSpec();
    const endpoints = res?.es?.endpoints ?? {};
    const ingest = endpoints['ingest.put_pipeline'] as
      | { data_autocomplete_rules?: { processors?: Array<{ __one_of?: Array<Record<string, { __template?: JsonValue }>> }> } }
      | undefined;
    const oneOf = ingest?.data_autocomplete_rules?.processors?.[0]?.__one_of ?? [];
    if (!Array.isArray(oneOf) || oneOf.length === 0) {
      return [];
    }
    return oneOf
      .map((entry) => {
        const name = Object.keys(entry)[0];
        if (!name) return undefined;
        const def = (entry as Record<string, { __template?: JsonValue }>)[name];
        return { name, template: def?.__template } as ProcessorSuggestion | undefined;
      })
      .filter((s): s is ProcessorSuggestion => Boolean(s));
  }
}

