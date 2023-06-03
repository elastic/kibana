/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { NodeDefinitionWithChildren } from '.';

export type ID =
  | 'sharedux:devtools'
  | 'root'
  | 'console'
  | 'search_profiler'
  | 'grok_debugger'
  | 'painless_lab';

export const devtools: NodeDefinitionWithChildren<ID> = {
  title: 'Developer tools',
  id: 'sharedux:devtools',
  icon: 'editorCodeBlock',
  children: [
    {
      id: 'root',
      children: [
        {
          title: 'Console',
          id: 'console',
        },
        {
          title: 'Search profiler',
          id: 'search_profiler',
        },
        {
          title: 'Grok debugger',
          id: 'grok_debugger',
        },
        {
          title: 'Painless lab',
          id: 'painless_lab',
        },
      ],
    },
  ],
};
