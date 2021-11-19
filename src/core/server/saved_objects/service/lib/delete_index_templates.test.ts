/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { elasticsearchClientMock } from '../../../elasticsearch/client/mocks';
import { loggerMock } from '../../../logging/logger.mock';
import { deleteIndexTemplates } from './delete_index_templates';

describe('deleteIndexTemplates', () => {
  let log: ReturnType<typeof loggerMock.create>;
  let client: ReturnType<typeof elasticsearchClientMock.createElasticsearchClient>;

  beforeEach(() => {
    log = loggerMock.create();
    client = elasticsearchClientMock.createElasticsearchClient();
  });

  it('calls `client.cat.templates` with the correct parameters', async () => {
    await deleteIndexTemplates({ client, log });

    expect(client.cat.templates).toHaveBeenCalledTimes(1);
    expect(client.cat.templates).toHaveBeenCalledWith({
      format: 'json',
      name: 'kibana_index_template*',
    });
  });

  it('calls `client.indices.deleteTemplate` for each template', async () => {
    client.cat.templates.mockReturnValue(
      elasticsearchClientMock.createSuccessTransportRequestPromise([
        { name: 'kibana_index_template:.kibana' },
        { name: 'kibana_index_template:.another-template' },
      ])
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

  it('logs a debug message with the name of the templates', async () => {
    client.cat.templates.mockReturnValue(
      elasticsearchClientMock.createSuccessTransportRequestPromise([
        { name: 'template1' },
        { name: 'template2' },
      ])
    );

    await deleteIndexTemplates({ client, log });

    expect(loggerMock.collect(log).debug).toEqual([
      ['Deleting index templates: template1, template2'],
    ]);
  });
});
