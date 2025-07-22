/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { SemVer, valid } from 'semver';
import type { MappingTypeMapping } from '@elastic/elasticsearch/lib/api/types';
import type { ElasticsearchClient } from '@kbn/core-elasticsearch-server';
import { migrationRetryCallCluster } from '@kbn/core-elasticsearch-server-internal';

export interface IndexDetails {
  mappings: MappingTypeMapping;
  aliases: string[];
}

export const getIndexDetails = async (
  client: ElasticsearchClient,
  index: string,
  retryDelay = 2500
): Promise<IndexDetails> => {
  const [mappingResponse, aliasResponse] = await Promise.all([
    migrationRetryCallCluster(() => client.indices.getMapping({ index }), retryDelay),
    migrationRetryCallCluster(() => client.indices.getAlias({ index }), retryDelay),
  ]);

  // { '.kibana_9.1.0_001': { mappings: { ... } }
  const mappings = Object.values(mappingResponse)[0].mappings;

  // { '.kibana_9.1.0_001': { aliases: { '.kibana': [Object], '.kibana_9.1.0': [Object] } }
  const aliases = Object.keys(Object.values(aliasResponse)[0].aliases);

  return { mappings, aliases };
};

export const extractVersionFromKibanaIndexAliases = (aliases: string[]): string | undefined => {
  const versions: SemVer[] = aliases
    .map((alias) => alias.split('_').pop()!)
    .filter((version) => valid(version))
    .map((version) => new SemVer(version));

  if (versions.length === 0) {
    // the version aliases were introduced in 7.11.0
    return undefined;
  } else if (versions.length === 1) {
    return versions[0].toString();
  } else {
    // an index shouldn't have more than one version alias pointing to it
    // but we'll get the latest just in case
    return versions
      .sort((a, b) => a.compare(b))
      .pop()!
      .toString();
  }
};
