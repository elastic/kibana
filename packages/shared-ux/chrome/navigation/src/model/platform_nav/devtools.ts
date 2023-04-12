/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { NavItemProps } from '../../../types';
import { locatorIds } from './_locators';

export const devtoolsItemSet: NavItemProps[] = [
  {
    name: '',
    id: 'root',
    items: [
      {
        name: 'Console',
        id: 'console',
        locator: { id: locatorIds.console },
      },
      {
        name: 'Search profiler',
        id: 'search_profiler',
        locator: { id: locatorIds.searchprofiler },
      },
      {
        name: 'Grok debugger',
        id: 'grok_debugger',
        locator: { id: locatorIds.grokDebugger },
      },
      {
        name: 'Painless lab',
        id: 'painless_lab',
        locator: { id: locatorIds.painlessLab },
      },
    ],
  },
];
