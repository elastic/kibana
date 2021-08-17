/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { get } from 'lodash';
import { readIndex } from '@kbn/securitysolution-es-utils';
import { ElasticsearchClient } from '../elasticsearch_client';

export const getIndexVersion = async (
  esClient: ElasticsearchClient,
  index: string
): Promise<number> => {
  const { body: indexAlias } = await esClient.indices.getAlias({
    index,
  });
  const writeIndex = Object.keys(indexAlias).find(
    (key) => indexAlias[key].aliases[index]?.is_write_index
  );
  if (writeIndex === undefined) {
    return 0;
  }
  const writeIndexMapping = await readIndex(esClient, writeIndex);
  return get(writeIndexMapping, ['body', writeIndex, 'mappings', '_meta', 'version']) ?? 0;
};
