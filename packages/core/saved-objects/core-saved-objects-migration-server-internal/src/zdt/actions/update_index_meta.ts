/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ElasticsearchClient } from '@kbn/core-elasticsearch-server';
import type { IndexMappingMeta } from '@kbn/core-saved-objects-base-server-internal';
import { updateMappings } from '../../actions';

export interface UpdateIndexMetaParams {
  client: ElasticsearchClient;
  index: string;
  meta: IndexMappingMeta;
}

export const updateIndexMeta = ({
  client,
  index,
  meta,
}: UpdateIndexMetaParams): ReturnType<typeof updateMappings> => {
  return updateMappings({
    client,
    index,
    mappings: {
      properties: {},
      _meta: meta,
    },
  });
};
