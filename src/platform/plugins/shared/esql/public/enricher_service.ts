/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { Logger } from '@kbn/logging';
import { reportEsqlError } from '@kbn/esql-editor';

type Enricher<T> = (items: T[]) => Promise<T[]>;

/**
 * Generic service to manage ES|QL autocomplete enrichers.
 * Enrichers are chained in registration order and applied to autocomplete suggestions.
 */
export class EnricherService<T> {
  private readonly enrichers: Enricher<T>[] = [];

  constructor(private readonly logger: Logger, private readonly errorType: string) {}

  register(enricher: Enricher<T>): void {
    this.enrichers.push(enricher);
  }

  async enrich(items: T[]): Promise<T[]> {
    let enriched = items;
    for (const enricher of this.enrichers) {
      try {
        enriched = await enricher(enriched);
      } catch (error) {
        this.logger.error(error);
        reportEsqlError(error, { errorType: this.errorType });
      }
    }
    return enriched;
  }
}
