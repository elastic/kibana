/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { InfraDatabase } from '../constants';
import type { AppPool, InfraPool, TechPool } from '../types';

export const DATABASE: Record<
  InfraDatabase,
  TechPool<InfraPool<'db_timeout'>, AppPool<'db_timeout'>>
> = {
  postgres: {
    infra: {
      healthy: [
        `LOG:  connection received: host={db_host} port=49312 user=app_user database={db_name}`,
        `LOG:  duration: 1.000 ms  statement: SELECT 1 /* healthcheck */`,
      ],
      db_timeout: {
        warn: [
          `LOG:  duration: 8435 ms  statement: SELECT * FROM {table} WHERE id=$1 /* hash={hash} */`,
          `LOG:  process {conn_id} still waiting for ShareLock on transaction after 8421 ms`,
        ],
        error: [
          `FATAL:  remaining connection slots are reserved for non-replication superuser connections`,
          `could not connect to the server: Connection refused\n\tIs the server running on host "{db_host}" and accepting TCP/IP connections on port 5432?`,
        ],
      },
    },
    app: {
      success: {
        go: [`level=info msg="tx committed" table={table} conn={conn_id}`],
        python: [`INFO     app.db  query executed table={table} query_hash=a3f8b21c rows=1`],
        java: [
          `[{thread}] INFO  {app_pkg}.Repository - query executed table={table} hash=a3f8b21c rows=1`,
        ],
        node: [
          `{"level":"info","msg":"query executed","table":"{table}","query_hash":"a3f8b21c","rows":1}`,
        ],
      },
      db_timeout: {
        go: {
          warn: [
            `level=warn msg="pgx: connection pool approaching limit" idle=1 total=10 host={db_host} rid={request_id}`,
          ],
          error: [
            `level=error msg="pgx: connection pool exhausted" host={db_host} waiting=48 idle=0 total=10 rid={request_id}`,
          ],
        },
        python: {
          warn: [
            `WARNING  app.db  SQLAlchemy pool pre_ping failed, retrying host={db_host} rid={request_id}`,
          ],
          error: [
            `ERROR    app.db  psycopg2.OperationalError: could not connect to server: Connection timed out host={db_host} rid={request_id}`,
          ],
        },
        java: {
          warn: [
            `[{thread}] WARN  {app_pkg}.Repository - HikariPool: connection pool at 90% capacity host={db_host} rid={request_id}`,
          ],
          error: [
            `[{thread}] ERROR {app_pkg}.Repository - com.zaxxer.hikari.pool.HikariPool$PoolEntryCreator: Connection pool exhausted waitingCount=48 totalConnections=10 host={db_host} rid={request_id}`,
          ],
        },
        node: {
          warn: [
            `{"level":"warn","msg":"pg pool approaching limit","idleCount":1,"totalCount":10,"host":"{db_host}","reqId":"{request_id}"}`,
          ],
          error: [
            `{"level":"error","msg":"pg connection pool exhausted","waitingCount":48,"idleCount":0,"totalCount":10,"host":"{db_host}","reqId":"{request_id}"}`,
          ],
        },
      },
    },
  },

  mongodb: {
    infra: {
      healthy: [
        `{"t":{"$date":"{timestamp}"},"s":"I","c":"NETWORK","id":22943,"ctx":"listener","msg":"Connection accepted","attr":{"remote":"{db_host}:49312","connectionId":1,"connectionCount":5}}`,
        `{"t":{"$date":"{timestamp}"},"s":"I","c":"COMMAND","id":20883,"ctx":"conn{conn_id}","msg":"About to run command","attr":{"commandName":"ping","db":"admin"}}`,
      ],
      db_timeout: {
        warn: [
          `{"t":{"$date":"{timestamp}"},"s":"W","c":"COMMAND","id":51803,"ctx":"conn{conn_id}","msg":"Slow query","attr":{"ns":"{table}","millis":42,"planSummary":"COLLSCAN","keysExamined":0}}`,
          `{"t":{"$date":"{timestamp}"},"s":"W","c":"COMMAND","id":51803,"ctx":"conn{conn_id}","msg":"Slow query","attr":{"ns":"{table}","millis":42,"planSummary":"IXSCAN { _id: 1 }","keysExamined":1,"docsExamined":1}}`,
        ],
        error: [
          `{"t":{"$date":"{timestamp}"},"s":"E","c":"NETWORK","id":23011,"ctx":"conn{conn_id}","msg":"Error connecting to host","attr":{"error":"Connection refused","remote":"{db_host}:27017"}}`,
          `{"t":{"$date":"{timestamp}"},"s":"E","c":"REPL","id":21402,"ctx":"ReplBatcher","msg":"Failed to connect to primary","attr":{"host":"{db_host}","error":"Connection refused"}}`,
        ],
      },
    },
    app: {
      success: {
        go: [`level=info msg="insert ok" collection={table}`],
        node: [
          `{"level":"info","msg":"document found","collection":"{table}","reqId":"{request_id}"}`,
        ],
      },
      db_timeout: {
        go: {
          warn: [
            `level=warn msg="mongo: connection pool approaching limit" idle=1 total=10 host={db_host}`,
          ],
          error: [
            `level=error msg="mongo: context deadline exceeded" op=find collection={table} rid={request_id}`,
          ],
        },
        node: {
          warn: [
            `{"level":"warn","msg":"mongodb pool saturation","active":9,"total":10,"host":"{db_host}"}`,
          ],
          error: [
            `{"level":"error","msg":"mongodb operation timeout","collection":"{table}","host":"{db_host}","reqId":"{request_id}"}`,
          ],
        },
      },
    },
  },

  elasticsearch: {
    infra: {
      healthy: [
        `[{timestamp}][INFO ][o.e.c.s.ClusterApplierService] [elasticsearch] master node changed, current [elasticsearch-{table}]`,
        `[{timestamp}][INFO ][o.e.c.s.ClusterApplierService] [elasticsearch] applied cluster state with version 42`,
      ],
      db_timeout: {
        warn: [
          `[{timestamp}][WARN ][o.e.i.s.SearchSlowLog    ] [elasticsearch] [{table}][0] took[42ms], took_millis[42], total_hits[-1 hits], types[], stats[], search_type[QUERY_THEN_FETCH], total_shards[1], source[{"query":{"match_all":{}}}]`,
          `[{timestamp}][WARN ][o.e.i.s.IndexingSlowLog  ] [elasticsearch] [{table}][0] took[42ms], took_millis[42], type[-], id[1], routing[], source[{"field":"value"}]`,
        ],
        error: [
          `[{timestamp}][ERROR][o.e.t.TransportService    ] [elasticsearch] failed to connect to node [{table}][{db_host}:9300], connection refused`,
          `[{timestamp}][ERROR][o.e.c.NodeConnectionsService] [elasticsearch] unexpected recoverable transport exception connecting to node [{db_host}:9200]: connection refused`,
        ],
      },
    },
    app: {
      success: {
        go: [`level=info msg="es search hit" index={table} hits=1`],
        node: [`{"level":"info","msg":"es search hit","index":"{table}","hits":1}`],
      },
      db_timeout: {
        go: {
          warn: [`level=warn msg="es: connection pool saturation" idle=0 total=5 host={db_host}`],
          error: [
            `level=error msg="es: context deadline exceeded" op=search index={table} rid={request_id}`,
          ],
        },
        node: {
          warn: [
            `{"level":"warn","msg":"elasticsearch pool saturation","idle":0,"total":5,"host":"{db_host}"}`,
          ],
          error: [
            `{"level":"error","msg":"elasticsearch timeout","index":"{table}","host":"{db_host}","reqId":"{request_id}"}`,
          ],
        },
      },
    },
  },
};
