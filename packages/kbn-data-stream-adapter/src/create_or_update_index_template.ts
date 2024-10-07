/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type {
  IndicesPutIndexTemplateRequest,
  MappingTypeMapping,
} from '@elastic/elasticsearch/lib/api/typesWithBodyKey';
import type { Logger, ElasticsearchClient } from '@kbn/core/server';
import { isEmpty } from 'lodash/fp';
import { retryTransientEsErrors } from './retry_transient_es_errors';

interface CreateOrUpdateIndexTemplateOpts {
  logger: Logger;
  esClient: ElasticsearchClient;
  template: IndicesPutIndexTemplateRequest;
}

/**
 * Installs index template that uses installed component template
 * Prior to installation, simulates the installation to check for possible
 * conflicts. Simulate should return an empty mapping if a template
 * conflicts with an already installed template.
 */
export const createOrUpdateIndexTemplate = async ({
  logger,
  esClient,
  template,
}: CreateOrUpdateIndexTemplateOpts) => {
  logger.info(`Installing index template ${template.name}`);

  let mappings: MappingTypeMapping = {};
  try {
    // Simulate the index template to proactively identify any issues with the mapping
    const simulateResponse = await retryTransientEsErrors(
      () => esClient.indices.simulateTemplate(template),
      { logger }
    );
    mappings = simulateResponse.template.mappings;
  } catch (err) {
    logger.error(
      `Failed to simulate index template mappings for ${template.name}; not applying mappings - ${err.message}`,
      err
    );
    return;
  }

  if (isEmpty(mappings)) {
    throw new Error(
      `No mappings would be generated for ${template.name}, possibly due to failed/misconfigured bootstrapping`
    );
  }

  try {
    await retryTransientEsErrors(() => esClient.indices.putIndexTemplate(template), {
      logger,
    });
  } catch (err) {
    logger.error(`Error installing index template ${template.name} - ${err.message}`, err);
    throw err;
  }
};
