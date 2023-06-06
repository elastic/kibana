/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import type { AppDeepLink } from '@kbn/core/public';

import type { LinkId } from './deep_links';

export const DEV_TOOLS_APP_ID = 'dev_tools';

export const searchProfiler: AppDeepLink<LinkId> = {
  id: 'searchprofiler',
  title: 'Search Profiler',
  path: '#/searchprofiler',
};

export const painlessLab: AppDeepLink<LinkId> = {
  id: 'painless_lab',
  title: 'Painless Lab',
  path: '#/painless_lab',
};

export const grokDebugger: AppDeepLink<LinkId> = {
  id: 'grokdebugger',
  title: 'Grok Debugger',
  path: '#/grokdebugger',
};

export const console: AppDeepLink<LinkId> = {
  id: 'console',
  title: 'Console',
  path: '#/console',
};

export const deepLinks: Array<AppDeepLink<LinkId>> = [
  searchProfiler,
  painlessLab,
  grokDebugger,
  console,
];
