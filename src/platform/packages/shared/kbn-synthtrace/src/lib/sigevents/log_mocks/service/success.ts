/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { InfraCache, InfraDatabase, InfraMessageQueue } from '../../constants';
import type { Runtime } from '../../types';

export interface SuccessCorpus {
  always: Partial<Record<Runtime, string[]>>;
  database: Partial<Record<Runtime, Record<InfraDatabase, string[]>>>;
  cache: Partial<Record<Runtime, Record<InfraCache, string[]>>>;
  messageQueue: Partial<Record<Runtime, Record<InfraMessageQueue, string[]>>>;
}

export const SUCCESS: SuccessCorpus = {
  always: {
    go: [
      `{"level":"info","msg":"{app_pascal}Service.handle completed","request_id":"{request_id}"}`,
    ],
    python: [
      `INFO     app.{app_snake}  {app_pascal}Service.handle completed request_id={request_id}`,
    ],
    java: [
      `[{thread}] INFO  {app_pkg}.{app_pascal}Service - request processed user_id={user_id} trace_id={request_id} trace_flags=01`,
    ],
    node: [`{"level":"info","msg":"{app_pascal}Service.handle completed","reqId":"{request_id}"}`],
  },

  database: {
    go: {
      postgres: [`level=info msg="tx committed" table={table} conn={conn_id}`],
      mongodb: [`level=info msg="insert ok" collection={table}`],
      elasticsearch: [`level=info msg="es search hit" index={table} hits=1`],
    },
    python: {
      postgres: [`INFO     app.db  query executed table={table} query_hash=a3f8b21c rows=1`],
      mongodb: [`INFO     app.mongo  document found collection={table} request_id={request_id}`],
      elasticsearch: [`INFO     app.es  index doc ok index={table}`],
    },
    java: {
      postgres: [
        `[{thread}] INFO  {app_pkg}.Repository - query executed table={table} hash=a3f8b21c rows=1`,
      ],
      mongodb: [`[{thread}] INFO  {app_pkg}.MongoRepo - findOne collection={table} result=found`],
      elasticsearch: [`[{thread}] INFO  {app_pkg}.EsClient - search index={table} hits=1`],
    },
    node: {
      postgres: [
        `{"level":"info","msg":"query executed","table":"{table}","query_hash":"a3f8b21c","rows":1}`,
      ],
      mongodb: [
        `{"level":"info","msg":"document found","collection":"{table}","reqId":"{request_id}"}`,
      ],
      elasticsearch: [`{"level":"info","msg":"es search hit","index":"{table}","hits":1}`],
    },
  },

  cache: {
    go: {
      redis: [
        `{"level":"info","msg":"CacheStore.GetAsync","key":"{request_id}","hit":true,"ttl_s":300}`,
      ],
    },
    python: {
      redis: [`INFO     app.{app_snake}.cache  CacheStore.get key={request_id} hit=True ttl=300`],
    },
    java: {
      redis: [
        `[{thread}] INFO  {app_pkg}.CacheStore - setAsync key={request_id} ttl_s=300 trace_id={request_id} trace_flags=01`,
      ],
    },
    node: {
      redis: [`{"level":"info","msg":"CacheStore.setAsync","key":"{request_id}","ttl_s":300}`],
    },
  },

  messageQueue: {
    go: {
      kafka: [
        `{"level":"info","msg":"message produced","topic":"{table}","partition":0,"offset":1024}`,
      ],
    },
    python: {
      kafka: [`INFO     app.kafka  message produced topic={table} partition=0 offset=1024`],
    },
    java: {
      kafka: [
        `[{thread}] INFO  {app_pkg}.KafkaProducer - produced topic={table} partition=0 offset=1024`,
      ],
    },
    node: {
      kafka: [
        `{"level":"info","msg":"message produced","topic":"{table}","partition":0,"offset":1024}`,
      ],
    },
  },
};
