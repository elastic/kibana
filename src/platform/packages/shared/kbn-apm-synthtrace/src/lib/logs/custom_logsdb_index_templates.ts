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
  Synht2 = 'synth.2',
  SomeFailureStore = 'synth.fs',
  NoFailureStore = 'synth.no-fs',
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
        default_pipeline: 'logs@default-pipeline',
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
  [IndexTemplateName.Synht2]: {
    name: IndexTemplateName.Synht2,
    _meta: {
      managed: false,
      description: 'custom synth.2 template created by synthtrace tool.',
    },
    template: {
      settings: {
        default_pipeline: 'synth.2@pipeline',
      },
    },
    priority: 501,
    index_patterns: ['logs-synth.2-*'],
    composed_of: ['logs@mappings', 'logs@settings', 'ecs@mappings', 'synth.2@custom'],
    allow_auto_create: true,
    data_stream: {
      hidden: false,
    },
  },
  [IndexTemplateName.NoFailureStore]: {
    name: IndexTemplateName.NoFailureStore,
    _meta: {
      managed: false,
      description: 'custom index template created by synthtrace tool',
    },
    template: {
      settings: {
        default_pipeline: 'logs@default-pipeline',
      },
      // @ts-expect-error
      data_stream_options: {
        failure_store: {
          enabled: false,
        },
      },
    },
    priority: 500,
    index_patterns: ['logs-*'],
    composed_of: ['logs@mappings', 'logs@settings', 'ecs@mappings'],
    allow_auto_create: true,
    data_stream: {
      hidden: false,
    },
  },
  [IndexTemplateName.SomeFailureStore]: {
    name: IndexTemplateName.SomeFailureStore,
    _meta: {
      managed: false,
      description: 'custom index template created by synthtrace tool',
    },
    template: {
      settings: {
        default_pipeline: 'synth.fs@pipeline',
      },
      // @ts-expect-error
      data_stream_options: {
        failure_store: {
          enabled: true,
        },
      },
    },
    priority: 501,
    index_patterns: ['logs-synth.2*', 'logs-synth.3*'],
    composed_of: ['logs@mappings', 'logs@settings', 'ecs@mappings'],
    allow_auto_create: true,
    data_stream: {
      hidden: false,
    },
  },
};
