/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { InfraDatabase, InfraLogType } from '../../constants';

export const DATABASE: Record<InfraDatabase, Record<InfraLogType['database'], string[]>> = {
  postgres: {
    healthy: [
      `LOG:  connection received: host={db_host} port=49312 user=app_user database={db_name}`,
      `LOG:  duration: 1.000 ms  statement: SELECT 1 /* healthcheck */`,
    ],
    slow: [
      `LOG:  duration: 8435 ms  statement: SELECT * FROM {table} WHERE id=$1 /* hash={hash} */`,
      `LOG:  process {conn_id} still waiting for ShareLock on transaction after 8421 ms`,
    ],
    connection_refused: [
      `FATAL:  remaining connection slots are reserved for non-replication superuser connections`,
      `could not connect to the server: Connection refused\n\tIs the server running on host "{db_host}" and accepting TCP/IP connections on port 5432?`,
    ],
  },
  mongodb: {
    healthy: [
      `{"t":{"$date":"{timestamp}"},"s":"I","c":"NETWORK","id":22943,"ctx":"listener","msg":"Connection accepted","attr":{"remote":"{db_host}:49312","connectionId":1,"connectionCount":5}}`,
      `{"t":{"$date":"{timestamp}"},"s":"I","c":"COMMAND","id":20883,"ctx":"conn{conn_id}","msg":"About to run command","attr":{"commandName":"ping","db":"admin"}}`,
    ],
    slow: [
      `{"t":{"$date":"{timestamp}"},"s":"W","c":"COMMAND","id":51803,"ctx":"conn{conn_id}","msg":"Slow query","attr":{"ns":"{table}","millis":42,"planSummary":"COLLSCAN","keysExamined":0}}`,
      `{"t":{"$date":"{timestamp}"},"s":"W","c":"COMMAND","id":51803,"ctx":"conn{conn_id}","msg":"Slow query","attr":{"ns":"{table}","millis":42,"planSummary":"IXSCAN { _id: 1 }","keysExamined":1,"docsExamined":1}}`,
    ],
    connection_refused: [
      `{"t":{"$date":"{timestamp}"},"s":"E","c":"NETWORK","id":23011,"ctx":"conn{conn_id}","msg":"Error connecting to host","attr":{"error":"Connection refused","remote":"{db_host}:27017"}}`,
      `{"t":{"$date":"{timestamp}"},"s":"E","c":"REPL","id":21402,"ctx":"ReplBatcher","msg":"Failed to connect to primary","attr":{"host":"{db_host}","error":"Connection refused"}}`,
    ],
  },
  elasticsearch: {
    healthy: [
      `[{timestamp}][INFO ][o.e.c.s.ClusterApplierService] [elasticsearch] master node changed, current [elasticsearch-{table}]`,
      `[{timestamp}][INFO ][o.e.c.s.ClusterApplierService] [elasticsearch] applied cluster state with version 42`,
    ],
    slow: [
      `[{timestamp}][WARN ][o.e.i.s.SearchSlowLog    ] [elasticsearch] [{table}][0] took[42ms], took_millis[42], total_hits[-1 hits], types[], stats[], search_type[QUERY_THEN_FETCH], total_shards[1], source[{"query":{"match_all":{}}}]`,
      `[{timestamp}][WARN ][o.e.i.s.IndexingSlowLog  ] [elasticsearch] [{table}][0] took[42ms], took_millis[42], type[-], id[1], routing[], source[{"field":"value"}]`,
    ],
    connection_refused: [
      `[{timestamp}][ERROR][o.e.t.TransportService    ] [elasticsearch] failed to connect to node [{table}][{db_host}:9300], connection refused`,
      `[{timestamp}][ERROR][o.e.c.NodeConnectionsService] [elasticsearch] unexpected recoverable transport exception connecting to node [{db_host}:9200]: connection refused`,
    ],
  },
};
