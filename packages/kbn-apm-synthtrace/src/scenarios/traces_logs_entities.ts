/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { entity, generateShortId } from '@kbn/apm-synthtrace-client';
import { EntityFields } from '@kbn/apm-synthtrace-client/src/lib/entities/entity_fields';
import { Scenario } from '../cli/scenario';
import { getSynthtraceEnvironment } from '../lib/utils/get_synthtrace_environment';
import { withClient } from '../lib/utils/with_client';

const ENVIRONMENT = getSynthtraceEnvironment(__filename);

const scenario: Scenario<Partial<EntityFields>> = async (runOptions) => {
  const { logger } = runOptions;

  const SYNTH_NODE_TRACES_LOGS_ENTITY_ID = generateShortId();

  return {
    bootstrap: async ({ entityEsClient }) => {
      await entityEsClient.installEntityIndexPatterns();
    },
    generate: ({ range, clients: { entityEsClient } }) => {
      const entityHistoryTimestamps = range.interval('1m').rate(1);

      const synthNodeTracesLogs = entity.serviceEntity({
        entityId: SYNTH_NODE_TRACES_LOGS_ENTITY_ID,
        serviceName: 'synth-node-trace-logs',
        agentName: 'nodejs',
        dataStreamType: ['traces', 'logs'],
        environment: ENVIRONMENT,
      });

      const synthJavaTraces = entity.serviceEntity({
        entityId: SYNTH_NODE_TRACES_LOGS_ENTITY_ID,
        serviceName: 'synth-java-trace',
        agentName: 'java',
        dataStreamType: ['traces'],
        environment: ENVIRONMENT,
      });

      const synthGoTraces = entity.serviceEntity({
        entityId: SYNTH_NODE_TRACES_LOGS_ENTITY_ID,
        serviceName: 'synth-go-logs',
        agentName: 'go',
        dataStreamType: ['logs'],
        environment: ENVIRONMENT,
      });

      const historyEntries = entityHistoryTimestamps.generator((timestamp) => {
        return [
          synthNodeTracesLogs.timestamp(timestamp).metrics({
            failedTransactionRate: 1000,
            latency: 1000,
            logErrorRate: 10,
            logRate: 100,
            throughput: 1,
          }),
          synthJavaTraces.timestamp(timestamp).metrics({
            failedTransactionRate: 1000,
            latency: 1000,
            throughput: 1,
          }),
          synthGoTraces.timestamp(timestamp).metrics({
            logErrorRate: 10,
            logRate: 100,
          }),
        ];
      });

      return [
        withClient(
          entityEsClient,
          logger.perf('generating_entities_events', () => historyEntries)
        ),
      ];
    },
  };
};

export default scenario;
