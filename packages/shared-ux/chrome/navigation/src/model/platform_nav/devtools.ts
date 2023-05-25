/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { ChromeNavigationNodeViewModel } from '../../../types';

// TODO: Declare ChromeNavigationNode[] (with "link" to app id or deeplink id)
// and then call an api on the Chrome service to convert to ChromeNavigationNodeViewModel
// with its "href", "isActive"... metadata

export const devtoolsItemSet: ChromeNavigationNodeViewModel[] = [
  {
    title: '',
    id: 'root',
    items: [
      {
        title: 'Console',
        id: 'console',
        href: '/app/dev_tools#/console',
      },
      {
        title: 'Search profiler',
        id: 'search_profiler',
        href: '/app/dev_tools#/searchprofiler',
      },
      {
        title: 'Grok debugger',
        id: 'grok_debugger',
        href: '/app/dev_tools#/grokdebugger',
      },
      {
        title: 'Painless lab',
        id: 'painless_lab',
        href: '/app/dev_tools#/painless_lab',
      },
    ],
  },
];
