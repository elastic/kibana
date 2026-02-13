/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/**
 * RPC message types for host<->iframe communication.
 * All communication happens via structured JSON messages.
 */

// Request from iframe to host
export interface RpcRequest {
  type: 'request';
  id: string;
  method: string;
  params?: unknown;
}

// Response from host to iframe
export interface RpcResponse {
  type: 'response';
  id: string;
  result?: unknown;
  error?: RpcError;
}

// Event pushed from host to iframe (no response expected)
export interface RpcEvent {
  type: 'event';
  event: string;
  data?: unknown;
}

export interface RpcError {
  message: string;
  code?: string;
}

export type RpcMessage = RpcRequest | RpcResponse | RpcEvent;

/**
 * Capability method names exposed to iframe scripts.
 * This is the exhaustive allow-list of methods the sandbox can call.
 */
export type CapabilityMethod =
  | 'esql.query'
  | 'panel.getSize'
  | 'render.setContent'
  | 'render.setError'
  | 'log.info'
  | 'log.warn'
  | 'log.error';

/**
 * Input types for each capability method
 */
export interface EsqlQueryParams {
  query: string;
  params?: Record<string, unknown>;
  /** If true, apply dashboard time/filter/query context */
  useContext?: boolean;
}

export interface EsqlQueryResult {
  columns: Array<{ name: string; type: string }>;
  rows: Array<Record<string, unknown>>;
  rowCount: number;
  warning?: string;
}

export interface PanelSize {
  width: number;
  height: number;
}

export interface LogEntry {
  level: 'info' | 'warn' | 'error';
  message: string;
  timestamp: number;
  args?: unknown[];
}

/**
 * Runtime configuration for the iframe sandbox
 */
export interface SandboxConfig {
  /** Maximum query execution time in milliseconds */
  queryTimeout: number;
  /** Maximum number of rows returned from ESQL queries */
  maxRows: number;
  /** Maximum query string length in bytes */
  maxQueryLength: number;
  /** Maximum concurrent queries (per panel) */
  maxConcurrentQueries: number;
  /** Script execution timeout in milliseconds */
  scriptTimeout: number;
}

export const DEFAULT_SANDBOX_CONFIG: SandboxConfig = {
  queryTimeout: 30000,
  maxRows: 10000,
  maxQueryLength: 10240,
  maxConcurrentQueries: 1,
  scriptTimeout: 60000,
};

/**
 * Context provided by the parent dashboard for query execution
 */
export interface DashboardContext {
  timeRange?: {
    from: string;
    to: string;
  };
  query?: {
    query: string | { [key: string]: unknown };
    language: string;
  };
  filters?: Array<{
    meta: Record<string, unknown>;
    query?: Record<string, unknown>;
  }>;
}

/**
 * State of the iframe runtime
 */
export type RuntimeState = 'idle' | 'loading' | 'running' | 'error' | 'terminated';

/**
 * Events emitted by the bridge for monitoring
 */
export interface BridgeEvents {
  stateChange: RuntimeState;
  log: LogEntry;
  error: Error;
}
