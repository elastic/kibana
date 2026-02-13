/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

export type {
  RpcRequest,
  RpcResponse,
  RpcEvent,
  RpcMessage,
  RpcError,
  CapabilityMethod,
  EsqlQueryParams,
  EsqlQueryResult,
  PanelSize,
  LogEntry,
  SandboxConfig,
  DashboardContext,
  RuntimeState,
  BridgeEvents,
} from './types';
export { DEFAULT_SANDBOX_CONFIG } from './types';

export type { BridgeOptions, CapabilityHandlers } from './bridge';
export { ScriptPanelBridge, createScriptPanelBridge } from './bridge';

export type { EsqlExecutorDependencies, EsqlExecutorOptions } from './esql_executor';
export { EsqlExecutor, createEsqlExecutor } from './esql_executor';

export type { CapabilitiesOptions, PanelCapabilities } from './capabilities';
export { createCapabilityHandlers, createPanelCapabilities } from './capabilities';

export {
  generateIframeSrcDoc,
  generateLoadingSrcDoc,
  generateErrorSrcDoc,
} from './iframe_template';

export type { SandboxValidationResult } from './csp_security';
export {
  IFRAME_CSP_DIRECTIVES,
  generateIframeCspHeader,
  validateSandboxSecurity,
  checkParentCspCompatibility,
  SECURITY_CHECKLIST,
} from './csp_security';
