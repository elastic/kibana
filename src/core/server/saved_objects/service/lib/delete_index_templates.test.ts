/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { elasticsearchClientMock } from '../../../elasticsearch/client/mocks';
import { estypes } from '@elastic/elasticsearch';
import { loggerMock } from '../../../logging/logger.mock';
import { deleteIndexTemplates } from './delete_index_templates';

describe('deleteIndexTemplates', () => {
  let log: ReturnType<typeof loggerMock.create>;
  let client: ReturnType<typeof elasticsearchClientMock.createElasticsearchClient>;

  beforeEach(() => {
    log = loggerMock.create();
    client = elasticsearchClientMock.createElasticsearchClient();
  });

  it('calls `client.indices.getTemplate` with the correct parameters', async () => {
    await deleteIndexTemplates({ client, log });

    expect(client.indices.getTemplate).toHaveBeenCalledTimes(1);
    expect(client.indices.getTemplate).toHaveBeenCalledWith({
      name: 'kibana_index_template*',
    });
  });

  it('calls `client.indices.deleteTemplate` for each template', async () => {
    client.indices.getTemplate.mockReturnValue(
      elasticsearchClientMock.createSuccessTransportRequestPromise({
        'kibana_index_template:.kibana': {} as estypes.IndicesTemplateMapping,
        'kibana_index_template:.another-template': {} as estypes.IndicesTemplateMapping,
      })
    );

    await deleteIndexTemplates({ client, log });

    expect(client.indices.deleteTemplate).toHaveBeenCalledTimes(2);
    expect(client.indices.deleteTemplate).toHaveBeenCalledWith({
      name: 'kibana_index_template:.kibana',
    });
    expect(client.indices.deleteTemplate).toHaveBeenCalledWith({
      name: 'kibana_index_template:.another-template',
    });
  });

  it('does not throw if `client.indices.deleteTemplate` throws', async () => {
    client.indices.getTemplate.mockReturnValue(
      elasticsearchClientMock.createSuccessTransportRequestPromise({
        'kibana_index_template:.kibana': {} as estypes.IndicesTemplateMapping,
        'kibana_index_template:.another-template': {} as estypes.IndicesTemplateMapping,
      })
    );

    client.indices.deleteTemplate.mockImplementation(() => {
      return elasticsearchClientMock.createErrorTransportRequestPromise('oups');
    });

    await expect(deleteIndexTemplates({ client, log })).resolves.toBeDefined();
  });

  it('logs a debug message with the name of the templates', async () => {
    client.indices.getTemplate.mockReturnValue(
      elasticsearchClientMock.createSuccessTransportRequestPromise({
        template1: {} as estypes.IndicesTemplateMapping,
        template2: {} as estypes.IndicesTemplateMapping,
      })
    );

    await deleteIndexTemplates({ client, log });

    expect(loggerMock.collect(log).debug).toEqual([
      ['Deleting index templates: template1, template2'],
    ]);
  });
});
