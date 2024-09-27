/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { IndicesPutIndexTemplateRequest } from '@elastic/elasticsearch/lib/api/types';

export enum IndexTemplateName {
  LogsDb = 'logsdb',
}

export const indexTemplates: {
  [key in IndexTemplateName]: IndicesPutIndexTemplateRequest;
} = {
  [IndexTemplateName.LogsDb]: {
    name: IndexTemplateName.LogsDb,
    _meta: {
      managed: false,
      description: 'custom logsdb template created by synthtrace tool.',
    },
    template: {
      settings: {
        mode: 'logsdb',
      },
    },
    priority: 500,
    index_patterns: ['logs-logsdb.*-*'],
    composed_of: ['logs@mappings', 'logs@settings', 'ecs@mappings'],
    allow_auto_create: true,
    data_stream: {
      hidden: false,
    },
  },
};
