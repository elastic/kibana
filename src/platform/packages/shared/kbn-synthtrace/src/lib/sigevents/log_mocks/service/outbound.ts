/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */
import type { Protocols, Runtime } from '../../constants';
import { makeProtocol } from './utils';
import type { OutboundTemplate } from './utils';

// go (logfmt) + node (JSON) cover the two structurally distinct formats.
// python/java fall back to go via pickOutboundMessages.
export const OUTBOUND: Record<
  Protocols,
  {
    ok: Partial<Record<Runtime, OutboundTemplate[]>>;
    error: Partial<Record<Runtime, OutboundTemplate[]>>;
  }
> = {
  http: makeProtocol({
    go: [
      `{"level":"info","msg":"outbound request","target":"{target_svc}","method":"GET","path":"/api/{app_snake}","request_id":"{request_id}"}`,
      `{"level":"info","msg":"outbound response","target":"{target_svc}","status":{call_status},"request_id":"{request_id}"}`,
      `{"level":"error","msg":"outbound request failed","target":"{target_svc}","status":{call_status},"request_id":"{request_id}"}`,
    ],
    node: [
      `{"level":"info","msg":"outbound request","target":"{target_svc}","method":"GET","path":"/api/{app_snake}","reqId":"{request_id}"}`,
      `{"level":"info","msg":"outbound response","target":"{target_svc}","status":{call_status},"reqId":"{request_id}"}`,
      `{"level":"error","msg":"outbound request failed","target":"{target_svc}","status":{call_status},"reqId":"{request_id}"}`,
    ],
  }),
  grpc: makeProtocol({
    go: [
      `{"level":"info","msg":"gRPC call started","method":"{grpc_svc}","request_id":"{request_id}"}`,
      `{"level":"info","msg":"gRPC call ok","method":"{grpc_svc}","code":"OK","request_id":"{request_id}"}`,
      `{"level":"error","msg":"gRPC call failed","method":"{grpc_svc}","code":"UNAVAILABLE","request_id":"{request_id}"}`,
    ],
    node: [
      `{"level":"info","msg":"gRPC call started","method":"{grpc_svc}","reqId":"{request_id}"}`,
      `{"level":"info","msg":"gRPC call ok","method":"{grpc_svc}","code":"OK","reqId":"{request_id}"}`,
      `{"level":"error","msg":"gRPC call failed","method":"{grpc_svc}","code":"UNAVAILABLE","reqId":"{request_id}"}`,
    ],
  }),
  kafka: makeProtocol({
    go: [
      `{"level":"info","msg":"kafka produce","topic":"{topic}","key":"{request_id}","request_id":"{request_id}"}`,
      `{"level":"info","msg":"kafka deliver ok","topic":"{topic}","partition":0,"offset":1024,"request_id":"{request_id}"}`,
      `{"level":"error","msg":"kafka delivery failed","topic":"{topic}","error":"Leader Not Available","request_id":"{request_id}"}`,
    ],
    node: [
      `{"level":"info","msg":"kafka produce","topic":"{topic}","key":"{request_id}","reqId":"{request_id}"}`,
      `{"level":"info","msg":"kafka deliver ok","topic":"{topic}","partition":0,"offset":1024,"reqId":"{request_id}"}`,
      `{"level":"error","msg":"kafka delivery failed","topic":"{topic}","error":"Leader Not Available","reqId":"{request_id}"}`,
    ],
  }),
};
