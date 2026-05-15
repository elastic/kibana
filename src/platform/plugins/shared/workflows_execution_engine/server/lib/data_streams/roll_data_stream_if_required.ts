/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ElasticsearchClient, Logger } from '@kbn/core/server';
import { MANAGED_INDEX_MAPPINGS_VERSION_META_FIELD } from './constants';

export interface RollDataStreamIfRequiredParams {
  logger: Logger;
  esClient: ElasticsearchClient;
  dataStreamName: string;
  targetManagedIndexMappingsVersion: number;
}

/**
 * Schedules a lazy rollover when backing indices lack the target
 * `mappings._meta.managed_index_mappings_version`.
 */
export async function rollDataStreamIfRequired({
  logger,
  esClient,
  dataStreamName,
  targetManagedIndexMappingsVersion,
}: RollDataStreamIfRequiredParams): Promise<boolean> {
  const msgPrefix = `Data stream ${dataStreamName}`;
  const skipMessage = 'does not need to be rolled over';
  const scheduleMessage = 'scheduling lazy rollover';

  const exists = await esClient.indices.exists({
    index: dataStreamName,
    expand_wildcards: 'all',
  });

  if (!exists) {
    logger.debug(`${msgPrefix} does not exist so ${skipMessage}`);
    return false;
  }

  logger.debug(
    `${msgPrefix} target ${MANAGED_INDEX_MAPPINGS_VERSION_META_FIELD}: ${targetManagedIndexMappingsVersion}`
  );

  const indexMappings = await esClient.indices.getMapping({
    index: dataStreamName,
    allow_no_indices: true,
    expand_wildcards: 'all',
  });

  const mappingsArray = Object.values(indexMappings);
  if (mappingsArray.length === 0) {
    logger.debug(`${msgPrefix} has no backing indices so ${skipMessage}`);
    return false;
  }

  const deployedVersions = mappingsArray
    .map((m) => m.mappings._meta?.[MANAGED_INDEX_MAPPINGS_VERSION_META_FIELD])
    .filter((value): value is number => typeof value === 'number');

  const deployedVersion = deployedVersions.length === 0 ? undefined : Math.max(...deployedVersions);

  logger.debug(
    `${msgPrefix} deployed ${MANAGED_INDEX_MAPPINGS_VERSION_META_FIELD}: ${
      deployedVersion ?? '<none>'
    }`
  );

  if (deployedVersion === targetManagedIndexMappingsVersion) {
    logger.debug(`${msgPrefix} has latest mappings applied so ${skipMessage}`);
    return false;
  }

  if (deployedVersion !== undefined && deployedVersion > targetManagedIndexMappingsVersion) {
    throw new Error(
      `${msgPrefix} has ${MANAGED_INDEX_MAPPINGS_VERSION_META_FIELD} ${deployedVersion} which is newer than Kibana target ${targetManagedIndexMappingsVersion}`
    );
  }

  if (deployedVersion === undefined) {
    logger.info(
      `${msgPrefix} has no ${MANAGED_INDEX_MAPPINGS_VERSION_META_FIELD} on backing indices; ${scheduleMessage}`
    );
  } else {
    logger.info(
      `${msgPrefix} has ${MANAGED_INDEX_MAPPINGS_VERSION_META_FIELD} ${deployedVersion}, target is ${targetManagedIndexMappingsVersion}; ${scheduleMessage}`
    );
  }

  await esClient.indices.rollover({
    alias: dataStreamName,
    lazy: true,
  });

  logger.info(
    `${msgPrefix} scheduled lazy rollover for ${MANAGED_INDEX_MAPPINGS_VERSION_META_FIELD} ${targetManagedIndexMappingsVersion}`
  );
  return true;
}
