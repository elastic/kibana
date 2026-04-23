/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { Logger } from '@kbn/logging';
import type { ESQLSourceResult } from '@kbn/esql-types';

type SourceEnricher = (sources: ESQLSourceResult[]) => Promise<ESQLSourceResult[]>;

/**
 * Service to manage ES|QL source enrichers.
 * Enrichers are chained in registration order and applied to autocomplete source suggestions.
 */
export class SourceEnricherService {
  private readonly enrichers: SourceEnricher[] = [];

  constructor(private readonly logger: Logger) {}

  register(enricher: SourceEnricher): void {
    this.enrichers.push(enricher);
  }

  async enrich(sources: ESQLSourceResult[]): Promise<ESQLSourceResult[]> {
    let enriched = sources;
    for (const enricher of this.enrichers) {
      try {
        enriched = await enricher(enriched);
      } catch (error) {
        this.logger.error(error);
      }
    }
    return enriched;
  }
}
