/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { Client } from '@elastic/elasticsearch';
import { cleanWriteTargets } from '../../utils/clean_write_targets';
import { getApmWriteTargets } from '../utils/get_apm_write_targets';
import { Logger } from '../../utils/create_logger';
import { ApmElasticsearchOutputWriteTargets } from '../utils/apm_events_to_elasticsearch_output';
import { ApmFields } from '../apm_fields';
import { SpanIterable } from '../../span_iterable';
import { defaultProcessors, streamProcessAsync } from '../../stream_processor';

export class ApmSynthtraceEsClient {
  constructor(private readonly client: Client, private readonly logger: Logger) {}

  private getWriteTargets() {
    return getApmWriteTargets({ client: this.client });
  }

  clean() {
    return this.getWriteTargets().then((writeTargets) =>
      cleanWriteTargets({
        client: this.client,
        targets: Object.values(writeTargets),
        logger: this.logger,
      })
    );
  }

  async index(events: SpanIterable) {
    const writeTargets = await this.getWriteTargets();

    await this.client.helpers.bulk<ApmFields>({
      datasource: streamProcessAsync(defaultProcessors, events),
      // TODO bug in client not passing generic to BulkHelperOptions<>
      onDocument: (doc: unknown) => {
        const d = doc as ApmFields;
        const index =
          writeTargets[d['processor.event'] as keyof ApmElasticsearchOutputWriteTargets];
        return { index: { _index: index } };
      },
    });

    return this.client.indices.refresh({
      index: Object.values(writeTargets),
    });
  }
}
