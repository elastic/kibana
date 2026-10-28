/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { CoreSetup } from '@kbn/core/server';
import type { MappingsDefinition } from '@kbn/es-mappings';
import { mappings } from '@kbn/es-mappings';
import { WORKFLOWS_EXECUTIONS_IO_DATA_STREAM } from './constants';

/**
 * `value` is intentionally unmapped (`dynamic: false`) so arbitrary JSON stays in `_source`.
 */
export const EXECUTIONS_IO_DATA_STREAM_MAPPINGS = {
  dynamic: false,
  properties: {
    '@timestamp': mappings.date(),
    id: mappings.keyword(),
    type: mappings.keyword(),
    size: mappings.long(),
  },
} satisfies MappingsDefinition;

export const EXECUTIONS_IO_DATA_STREAM_DEFINITION = {
  name: WORKFLOWS_EXECUTIONS_IO_DATA_STREAM,
  version: 1,
  hidden: true,
  settings: {
    auto_expand_replicas: '0-1',
    'index.lifecycle.prefer_ilm': false,
  },
  mappings: EXECUTIONS_IO_DATA_STREAM_MAPPINGS,
};

export function registerExecutionsIoDataStream(coreSetup: CoreSetup, dataRetention: string): void {
  coreSetup.dataStreams.registerDataStream({
    name: EXECUTIONS_IO_DATA_STREAM_DEFINITION.name,
    version: EXECUTIONS_IO_DATA_STREAM_DEFINITION.version,
    hidden: EXECUTIONS_IO_DATA_STREAM_DEFINITION.hidden,
    template: {
      mappings: EXECUTIONS_IO_DATA_STREAM_DEFINITION.mappings,
      settings: EXECUTIONS_IO_DATA_STREAM_DEFINITION.settings,
      lifecycle: { data_retention: dataRetention },
    },
  });
}
