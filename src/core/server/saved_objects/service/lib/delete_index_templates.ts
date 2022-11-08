/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { ElasticsearchClient } from '../../../elasticsearch';
import type { Logger } from '../../../logging';

interface DeleteIndexTemplatesOptions {
  client: ElasticsearchClient;
  log: Logger;
}

/**
 * Deletes old index templates that were used in 6.x as those will no longer be supported in ES 8.
 */
export const deleteIndexTemplates = async ({ client, log }: DeleteIndexTemplatesOptions) => {
  const { body } = await client.indices.getTemplate(
    {
      name: 'kibana_index_template*',
    },
    { ignore: [404] }
  );

  const templateNames = Object.keys(body);

  log.debug(`Deleting index templates: ${templateNames.join(', ')}`);

  return await Promise.all(
    templateNames.map((templateName) => {
      return client.indices
        .deleteTemplate({
          name: templateName,
        })
        .catch(() => undefined);
    })
  );
};
