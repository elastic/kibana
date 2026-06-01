/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { Logger } from '@kbn/logging';
import type { EsqlView } from '@kbn/esql-types';
import { reportEsqlError } from '@kbn/esql-editor';

type ViewEnricher = (views: EsqlView[]) => Promise<EsqlView[]>;

/**
 * Service to manage ES|QL view enrichers.
 * Enrichers are chained in registration order and applied to autocomplete view suggestions.
 */
export class ViewEnricherService {
  private readonly enrichers: ViewEnricher[] = [];

  constructor(private readonly logger: Logger) {}

  register(enricher: ViewEnricher): void {
    this.enrichers.push(enricher);
  }

  async enrich(views: EsqlView[]): Promise<EsqlView[]> {
    let enriched = views;
    for (const enricher of this.enrichers) {
      try {
        enriched = await enricher(enriched);
      } catch (error) {
        this.logger.error(error);
        reportEsqlError(error, { errorType: 'ViewEnricher' });
      }
    }
    return enriched;
  }
}
