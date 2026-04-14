/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { Protocols, Runtime } from '../constants';

export type OutboundErrorCategory = 'timeout' | 'unavailable';

export interface OutboundPool {
  success: Record<Runtime, string>;
  error: { failed: Record<Runtime, string> } & Partial<
    Record<OutboundErrorCategory, Record<Runtime, string>>
  >;
}

export const OUTBOUND: Record<Protocols, OutboundPool> = {
  http: {
    success: {
      go: `level=info msg="outbound response" target={target_svc} status={call_status} request_id={request_id}`,
      node: `{"level":"info","msg":"outbound response","target":"{target_svc}","status":{call_status},"reqId":"{request_id}"}`,
      python: `INFO     {app_snake}.client  HTTP {call_status} from {target_svc} request_id={request_id}`,
      java: `INFO  {app_pkg}.HttpClient - HTTP {call_status} from {target_svc} rid={request_id}`,
    },
    error: {
      failed: {
        go: `level=error msg="outbound request failed" target={target_svc} status={call_status} request_id={request_id}`,
        node: `{"level":"error","msg":"outbound request failed","target":"{target_svc}","status":{call_status},"reqId":"{request_id}"}`,
        python: `ERROR    {app_snake}.client  Request to {target_svc} failed status={call_status} request_id={request_id}`,
        java: `ERROR {app_pkg}.HttpClient - HTTP {call_status} from {target_svc} rid={request_id}`,
      },
      timeout: {
        go: `level=error msg="outbound request timed out" target={target_svc} error="context deadline exceeded" request_id={request_id}`,
        node: `{"level":"error","msg":"outbound request timed out","target":"{target_svc}","err":{"code":"ETIMEDOUT"},"reqId":"{request_id}"}`,
        python: `ERROR    {app_snake}.client  requests.exceptions.Timeout: HTTPConnectionPool(host='{target_svc}') timed out request_id={request_id}`,
        java: `ERROR {app_pkg}.HttpClient - java.net.SocketTimeoutException: 1000ms timeout on connection to {target_svc} rid={request_id}`,
      },
      unavailable: {
        go: `level=error msg="outbound connection refused" target={target_svc} error="connection refused" request_id={request_id}`,
        node: `{"level":"error","msg":"outbound connection refused","target":"{target_svc}","err":{"code":"ECONNREFUSED"},"reqId":"{request_id}"}`,
        python: `ERROR    {app_snake}.client  requests.exceptions.ConnectionError: Failed to establish connection to {target_svc} request_id={request_id}`,
        java: `ERROR {app_pkg}.HttpClient - java.net.ConnectException: Connection refused to {target_svc} rid={request_id}`,
      },
    },
  },
  grpc: {
    success: {
      go: `level=info msg="gRPC call ok" method={grpc_svc} code=OK request_id={request_id}`,
      node: `{"level":"info","msg":"gRPC call ok","method":"{grpc_svc}","code":"OK","reqId":"{request_id}"}`,
      python: `INFO     {app_snake}.grpc  {grpc_svc} OK request_id={request_id}`,
      java: `INFO  {app_pkg}.GrpcClient - {grpc_svc} status=OK rid={request_id}`,
    },
    error: {
      failed: {
        go: `level=error msg="gRPC call failed" method={grpc_svc} code=UNAVAILABLE request_id={request_id}`,
        node: `{"level":"error","msg":"gRPC call failed","method":"{grpc_svc}","code":"UNAVAILABLE","reqId":"{request_id}"}`,
        python: `ERROR    {app_snake}.grpc  {grpc_svc} UNAVAILABLE request_id={request_id}`,
        java: `ERROR {app_pkg}.GrpcClient - io.grpc.StatusRuntimeException: UNAVAILABLE: {target_svc} unreachable rid={request_id}`,
      },
      timeout: {
        go: `level=error msg="gRPC call timed out" method={grpc_svc} code=DEADLINE_EXCEEDED request_id={request_id}`,
        node: `{"level":"error","msg":"gRPC call timed out","method":"{grpc_svc}","code":"DEADLINE_EXCEEDED","reqId":"{request_id}"}`,
        python: `ERROR    {app_snake}.grpc  {grpc_svc} DEADLINE_EXCEEDED request_id={request_id}`,
        java: `ERROR {app_pkg}.GrpcClient - io.grpc.StatusRuntimeException: DEADLINE_EXCEEDED: {grpc_svc} timed out rid={request_id}`,
      },
    },
  },
  kafka: {
    success: {
      go: `level=info msg="kafka deliver ok" topic={topic} partition=0 offset=1024 request_id={request_id}`,
      node: `{"level":"info","msg":"kafka deliver ok","topic":"{topic}","partition":0,"offset":1024,"reqId":"{request_id}"}`,
      python: `INFO     {app_snake}.kafka  delivered to {topic} partition=0 offset=1024`,
      java: `INFO  {app_pkg}.KafkaProducer - delivered to {topic} partition=0 offset=1024`,
    },
    error: {
      failed: {
        go: `level=error msg="kafka delivery failed" topic={topic} error="Leader Not Available" request_id={request_id}`,
        node: `{"level":"error","msg":"kafka delivery failed","topic":"{topic}","error":"Leader Not Available","reqId":"{request_id}"}`,
        python: `ERROR    {app_snake}.kafka  delivery failed topic={topic} error=Leader Not Available`,
        java: `ERROR {app_pkg}.KafkaProducer - org.apache.kafka.common.errors.NotLeaderOrFollowerException: {topic} leader unavailable`,
      },
      unavailable: {
        go: `level=error msg="kafka broker unreachable" topic={topic} error="BROKER_NOT_AVAILABLE" request_id={request_id}`,
        node: `{"level":"error","msg":"kafka broker unreachable","topic":"{topic}","error":"BROKER_NOT_AVAILABLE","reqId":"{request_id}"}`,
        python: `ERROR    {app_snake}.kafka  kafka.errors.NoBrokersAvailable: topic={topic}`,
        java: `ERROR {app_pkg}.KafkaProducer - org.apache.kafka.common.errors.BrokerNotAvailableException: {topic} broker unavailable`,
      },
    },
  },
};
