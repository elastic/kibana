/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { Client } from '@elastic/elasticsearch';
import { uploadEvents } from '../../scripts/utils/upload_events';
import { Fields } from '../entity';
import { cleanWriteTargets } from '../utils/clean_write_targets';
import { getBreakdownMetrics } from '../utils/get_breakdown_metrics';
import { getSpanDestinationMetrics } from '../utils/get_span_destination_metrics';
import { getTransactionMetrics } from '../utils/get_transaction_metrics';
import { getWriteTargets } from '../utils/get_write_targets';
import { Logger } from '../utils/logger';

export class SynthtraceEsClient {
  constructor(private readonly client: Client, private readonly logger: Logger) {}

  private getWriteTargets() {
    return getWriteTargets({ client: this.client });
  }

  clean() {
    return this.getWriteTargets().then((writeTargets) =>
      cleanWriteTargets({ client: this.client, writeTargets, logger: this.logger })
    );
  }

  async index(events: Fields[]) {
    const eventsToIndex = [
      ...events,
      ...getTransactionMetrics(events),
      ...getSpanDestinationMetrics(events),
      ...getBreakdownMetrics(events),
    ];

    const writeTargets = await this.getWriteTargets();

    await uploadEvents({
      batchSize: 1000,
      client: this.client,
      clientWorkers: 5,
      events: eventsToIndex,
      logger: this.logger,
      writeTargets,
    });

    return this.client.indices.refresh({
      index: Object.values(writeTargets),
    });
  }
}
