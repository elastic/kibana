/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { log as logDoc, timerange, infra } from '@kbn/synthtrace-client';
import { globalSetupHook } from '@kbn/scout';
import { getSynthtraceClient } from '@kbn/scout-synthtrace';
import { LOGSTASH_ES_ARCHIVE } from '../../../common/ui/fixtures/constants';
import { LOGS } from '../fixtures';

globalSetupHook(
  'Setup logs experience tests data',
  async ({ esArchiver, esClient, kbnUrl, log, config }) => {
    // Provides a non-logs index (`logstash-*`) for specs that need a data view which must
    // not match the logs profile.
    await esArchiver.loadIfNeeded(LOGSTASH_ES_ARCHIVE);
    log.debug('[setup:logs] logstash_functional archive loaded');

    const from = new Date(LOGS.DEFAULT_START_TIME).getTime();
    const to = new Date(LOGS.DEFAULT_END_TIME).getTime();

    // Logs data: the data source that triggers the logs profile.
    const { logsEsClient } = await getSynthtraceClient('logsEsClient', {
      esClient,
      log,
      config,
    });

    await logsEsClient.index([
      timerange(from, to)
        .interval('1m')
        .rate(5)
        .generator((timestamp: number) =>
          logDoc
            .create()
            .message('Test log message for recommended fields')
            .timestamp(timestamp)
            .dataset(LOGS.SYNTH_LOGS_DATASET)
            .namespace(LOGS.SYNTH_LOGS_NAMESPACE)
            .logLevel('info')
            .defaults({
              'event.dataset': LOGS.SYNTH_LOGS_DATASET,
              'log.level': 'info',
            })
        ),
    ]);
    log.debug('[setup:logs] synthtrace logs data indexed');

    // Metrics data: backs the `metrics-system*` data view, which must not match the logs profile.
    const { infraEsClient } = await getSynthtraceClient('infraEsClient', {
      esClient,
      kbnUrl: kbnUrl.get(),
      log,
      config,
    });

    await infraEsClient.index([
      timerange(from, to)
        .interval('1m')
        .rate(1)
        .generator((timestamp: number) => [
          infra.host(LOGS.SYNTH_METRICS_HOST).cpu().timestamp(timestamp),
          infra.host(LOGS.SYNTH_METRICS_HOST).memory().timestamp(timestamp),
          infra.host(LOGS.SYNTH_METRICS_HOST).network().timestamp(timestamp),
        ]),
    ]);
    log.debug('[setup:logs] synthtrace infra/metrics data indexed');
  }
);
