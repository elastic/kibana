/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

export const DEV_TOOLS_APP_ID = 'dev_tools' as const;

export const searchProfiler = {
  id: 'searchprofiler',
  title: 'Search Profiler',
  path: '#/searchprofiler',
} as const;

export const painlessLab = {
  id: 'painless_lab',
  title: 'Painless Lab',
  path: '#/painless_lab',
} as const;

export const grokDebugger = {
  id: 'grokdebugger',
  title: 'Grok Debugger',
  path: '#/grokdebugger',
} as const;

export const console = {
  id: 'console',
  title: 'Console',
  path: '#/console',
} as const;

export type DeepLink =
  | typeof searchProfiler
  | typeof painlessLab
  | typeof grokDebugger
  | typeof console;

export type LinkId = DeepLink['id'];

export type AppId = typeof DEV_TOOLS_APP_ID;

export type AppDeepLinkId = `${AppId}:${LinkId}`;

export const deepLinks: DeepLink[] = [searchProfiler, painlessLab, grokDebugger, console];
