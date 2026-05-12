/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

export const DEV_TOOLS_ALL_ROLE = {
  elasticsearch: { cluster: [] },
  kibana: [{ base: [], feature: { dev_tools: ['all'] }, spaces: ['*'] }],
};

export const DEV_TOOLS_READ_ROLE = {
  elasticsearch: { cluster: [] },
  kibana: [{ base: [], feature: { dev_tools: ['read'] }, spaces: ['*'] }],
};

export const NO_DEV_TOOLS_ROLE = {
  elasticsearch: { cluster: [] },
  kibana: [{ base: [], feature: { discover: ['all'] }, spaces: ['*'] }],
};

export const DEV_TOOL_APPS = [
  { hash: 'console', label: 'Console', readySubject: 'console' },
  { hash: 'grokdebugger', label: 'Grok Debugger', readySubject: 'grokDebuggerContainer' },
  { hash: 'searchprofiler', label: 'Search Profiler', readySubject: 'searchprofiler' },
  { hash: 'painless_lab', label: 'Painless Lab', readySubject: 'painless_lab' },
] as const;
