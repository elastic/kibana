/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type api from '@elastic/elasticsearch/lib/api/types';
import type { ElasticsearchClient } from '@kbn/core-elasticsearch-server';
import { prettyPrintAndSortKeys } from '@kbn/utils';
import { errors as EsErrors } from '@elastic/elasticsearch';
import type { Logger } from '@kbn/logging';
import { retryEs } from '../retry_es';
import type { AnyDataStreamDefinition } from '../types';
import { applyDefaults } from './defaults';
import { buildIndexTemplateBody } from './template_body';

function normalizeLifecycle(
  lifecycle: api.IndicesDataStreamLifecycleWithRollover | undefined
): api.IndicesDataStreamLifecycle | undefined {
  if (!lifecycle) {
    return undefined;
  }
  return {
    ...lifecycle,
    // Set enabled `true` to make comparison with ES response stable
    enabled: lifecycle.enabled ?? true,
  };
}

function lifecycleDefinitionChanged({
  existingIndexTemplate,
  dataStream,
}: {
  existingIndexTemplate: api.IndicesGetIndexTemplateIndexTemplateItem | undefined;
  dataStream: AnyDataStreamDefinition;
}) {
  const currentLifecycle = normalizeLifecycle(
    existingIndexTemplate?.index_template.template?.lifecycle
  );
  const desiredLifecycle = normalizeLifecycle(dataStream.template.lifecycle);

  const stringifyLifecycle = (lifecycle: api.IndicesDataStreamLifecycle | undefined) =>
    lifecycle ? prettyPrintAndSortKeys(lifecycle) : undefined;

  return stringifyLifecycle(currentLifecycle) !== stringifyLifecycle(desiredLifecycle);
}

async function applyDataStreamLifecycle({
  logger,
  elasticsearchClient,
  dataStream,
}: {
  logger: Logger;
  elasticsearchClient: ElasticsearchClient;
  dataStream: AnyDataStreamDefinition;
}) {
  const lifecycle = dataStream.template.lifecycle;

  if (lifecycle) {
    logger.debug(`Updating lifecycle on existing data stream: ${dataStream.name}`);
    await retryEs(
      () =>
        elasticsearchClient.indices.putDataLifecycle({
          name: dataStream.name,
          ...normalizeLifecycle(lifecycle),
        }),
      { logger, dataStreamName: dataStream.name }
    );
    return;
  }

  logger.debug(`Removing lifecycle from existing data stream: ${dataStream.name}`);
  try {
    await retryEs(
      () =>
        elasticsearchClient.indices.deleteDataLifecycle({
          name: dataStream.name,
        }),
      { logger, dataStreamName: dataStream.name }
    );
  } catch (error) {
    if (error instanceof EsErrors.ResponseError && error.statusCode === 404) {
      // Data stream has no lifecycle configuration, treat as idempotent remove.
      return;
    }
    throw error;
  }
}

/**
 * Migrate the existing write index of `dataStream` to match the **new** template definition.
 *
 * Runs `simulateTemplate` with the desired template body inline (so the resolved mappings come
 * from the not-yet-installed template, not from whatever template is currently installed in ES),
 * then applies the resolved mappings to the write index via `putMapping`, and updates the data
 * stream lifecycle when it differs from the installed value.
 *
 * Always runs the migration round-trip when `existingDataStream` has a write index, regardless
 * of any deployed `_meta.version`. This is the load-bearing invariant for issue #268853: the
 * template version is bumped only after this function has succeeded, so a migration failure
 * leaves `_meta.version` on disk untouched and the next boot can retry the migration cleanly.
 *
 * https://www.elastic.co/docs/manage-data/data-store/data-streams/set-up-data-stream
 */
export async function initializeDataStream({
  logger,
  dataStream,
  elasticsearchClient,
  existingDataStream,
  existingIndexTemplate,
}: {
  logger: Logger;
  dataStream: AnyDataStreamDefinition;
  elasticsearchClient: ElasticsearchClient;
  existingDataStream: api.IndicesDataStream;
  existingIndexTemplate: api.IndicesGetIndexTemplateIndexTemplateItem | undefined;
}): Promise<{ migrated: boolean }> {
  const version = dataStream.version;
  logger.debug(`Migrating data stream write index: ${dataStream.name} v${version}`);

  // https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-indices-get-data-stream#operation-indices-get-data-stream-200-body-application-json-data_streams-indices
  // The last item in this array contains information about the stream’s current write index.
  const { indices } = existingDataStream;
  const writeIndex = indices[indices.length - 1];
  if (!writeIndex) {
    logger.debug(
      `Data stream ${dataStream.name} has no write index yet, cannot apply mappings or settings.`
    );
    return { migrated: false };
  }

  // Resolve mappings from the **new** template body (the one not yet installed) by simulating
  // it. The body fields drive resolution; `name` is passed alongside the body so ES treats this
  // as "simulate as if I PUT this body under this name" — body fields override the installed
  // template's fields during rendering. Without `name`, ES validates the body as a new
  // anonymous template and rejects it for pattern/priority conflict with the same-named
  // template already installed.
  const desiredBody = buildIndexTemplateBody(applyDefaults(dataStream), []);
  const {
    template: { mappings },
  } = await retryEs(
    () => elasticsearchClient.indices.simulateTemplate({ name: dataStream.name, ...desiredBody }),
    { logger, dataStreamName: dataStream.name }
  );

  logger.debug(`Applying mappings to write index: ${writeIndex.index_name}`);
  await retryEs(
    () =>
      elasticsearchClient.indices.putMapping({
        index: writeIndex.index_name,
        ...mappings,
      }),
    { logger, dataStreamName: dataStream.name }
  );

  if (
    lifecycleDefinitionChanged({
      existingIndexTemplate,
      dataStream,
    })
  ) {
    await applyDataStreamLifecycle({
      logger,
      elasticsearchClient,
      dataStream,
    });
  }

  return { migrated: true };
}

/**
 * Create the data stream when it doesn't already exist.
 *
 * Idempotent on `resource_already_exists_exception` (treated as a benign race with another
 * concurrent create call).
 *
 * Must be called after the index template has been installed, otherwise the data stream cannot
 * be created.
 */
export async function createDataStream({
  logger,
  dataStream,
  elasticsearchClient,
}: {
  logger: Logger;
  dataStream: AnyDataStreamDefinition;
  elasticsearchClient: ElasticsearchClient;
}): Promise<{ created: boolean }> {
  logger.debug(`Creating data stream: ${dataStream.name}.`);
  try {
    await retryEs(
      () =>
        elasticsearchClient.indices.createDataStream({
          name: dataStream.name,
        }),
      { logger, dataStreamName: dataStream.name }
    );
    return { created: true };
  } catch (error) {
    if (
      error instanceof EsErrors.ResponseError &&
      error.statusCode === 400 &&
      error.body?.error.type === 'resource_already_exists_exception'
    ) {
      // Data stream already exists, we can ignore this error, probably racing another create call
      logger.debug(`Data stream already exists: ${dataStream.name}`);
      return { created: false };
    }
    throw error;
  }
}
