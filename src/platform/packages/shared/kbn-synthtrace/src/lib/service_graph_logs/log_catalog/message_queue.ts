/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { InfraMessageQueue } from '../constants';
import type { AppPool, InfraPool, TechPool } from '../types';

export const MESSAGE_QUEUE: Record<
  InfraMessageQueue,
  TechPool<InfraPool<'broker_down'>, AppPool>
> = {
  kafka: {
    infra: {
      healthy: [
        `[LocalLog partition=__cluster_metadata-0, dir=/tmp/kafka-logs] Rolled new log segment at offset 300543 in 0 ms.`,
        `[SnapshotEmitter id=1] Successfully wrote snapshot 00000000000000300572-0000000001`,
        `Deleted snapshot files for snapshot OffsetAndEpoch(offset=300221, epoch=1).`,
      ],
      broker_down: {
        warn: [
          `[Partition {topic}-0 broker=1] Shrinking ISR from 1,2,3 to 1 due to follower 2,3 being out of sync (kafka.cluster.Partition)`,
          `[GroupCoordinator 1]: Preparing to rebalance group {consumer_group} in state Stable with old generation 5 (__consumer_offsets-12) (reason: Removing member consumer-{consumer_group}-1 on LeaveGroup) (kafka.coordinator.group.GroupCoordinator)`,
        ],
        error: [
          `[Controller id=1 epoch=42] No live ISR replicas for partition {topic}-0: leader election failed (kafka.controller.KafkaController)`,
          `[ReplicaFetcherThread-0-2] Failed to fetch {topic}-0 from leader at {db_host}:9092: java.net.ConnectException: Connection refused (kafka.server.ReplicaFetcherThread)`,
        ],
      },
    },
    app: {
      success: {
        go: [
          `{"level":"info","msg":"message produced","topic":"{table}","partition":0,"offset":1024}`,
        ],
        python: [`INFO     app.kafka  message produced topic={table} partition=0 offset=1024`],
        java: [
          `[{thread}] INFO  {app_pkg}.KafkaProducer - produced topic={table} partition=0 offset=1024`,
        ],
        node: [
          `{"level":"info","msg":"message produced","topic":"{table}","partition":0,"offset":1024}`,
        ],
      },
    },
  },
};
