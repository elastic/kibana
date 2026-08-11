/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

export {
  API_CUSTOM_SPACE,
  API_CUSTOM_SPACE_DEV_TOOLS_DISABLED,
  CAPABILITIES_API_PATH,
  COMMON_HEADERS,
  CUSTOM_SPACE,
  CUSTOM_SPACE_DEV_TOOLS_DISABLED,
  DEV_TOOLS_ALL_ROLE,
  DEV_TOOLS_READ_ROLE,
  NO_DEV_TOOLS_ROLE,
} from '../../common/fixtures/constants';

export const DEV_TOOL_APPS = [
  { hash: 'console', label: 'Console', readySubject: 'console' },
  { hash: 'grokdebugger', label: 'Grok Debugger', readySubject: 'grokDebuggerContainer' },
  { hash: 'searchprofiler', label: 'Search Profiler', readySubject: 'searchprofiler' },
  { hash: 'painless_lab', label: 'Painless Lab', readySubject: 'painless_lab' },
] as const;
