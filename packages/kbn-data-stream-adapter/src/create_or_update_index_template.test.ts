/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { elasticsearchServiceMock, loggingSystemMock } from '@kbn/core/server/mocks';
import { errors as EsErrors } from '@elastic/elasticsearch';
import { createOrUpdateIndexTemplate } from './create_or_update_index_template';

const randomDelayMultiplier = 0.01;
const logger = loggingSystemMock.createLogger();
const esClient = elasticsearchServiceMock.createClusterClient().asInternalUser;

const getIndexTemplate = (namespace: string = 'default', useDataStream: boolean = false) => ({
  name: `.alerts-test.alerts-${namespace}-index-template`,
  body: {
    _meta: {
      kibana: {
        version: '8.6.1',
      },
      managed: true,
      namespace,
    },
    composed_of: ['mappings1', 'framework-mappings'],
    index_patterns: [`.internal.alerts-test.alerts-${namespace}-*`],
    template: {
      mappings: {
        _meta: {
          kibana: {
            version: '8.6.1',
          },
          managed: true,
          namespace,
        },
        dynamic: false,
      },
      settings: {
        auto_expand_replicas: '0-1',
        hidden: true,
        ...(useDataStream
          ? {}
          : {
              'index.lifecycle': {
                name: 'test-ilm-policy',
                rollover_alias: `.alerts-test.alerts-${namespace}`,
              },
            }),
        'index.mapping.ignore_malformed': true,
        'index.mapping.total_fields.limit': 2500,
      },
    },
    priority: namespace.length,
  },
});

const simulateTemplateResponse = {
  template: {
    aliases: {
      alias_name_1: {
        is_hidden: true,
      },
      alias_name_2: {
        is_hidden: true,
      },
    },
    mappings: { enabled: false },
    settings: {},
  },
};

describe('createOrUpdateIndexTemplate', () => {
  beforeEach(() => {
    jest.resetAllMocks();
    jest.spyOn(global.Math, 'random').mockReturnValue(randomDelayMultiplier);
  });

  it(`should call esClient to put index template`, async () => {
    esClient.indices.simulateTemplate.mockImplementation(async () => simulateTemplateResponse);
    await createOrUpdateIndexTemplate({ logger, esClient, template: getIndexTemplate() });

    expect(esClient.indices.simulateTemplate).toHaveBeenCalledWith(getIndexTemplate());
    expect(esClient.indices.putIndexTemplate).toHaveBeenCalledWith(getIndexTemplate());
  });

  it(`should retry on transient ES errors`, async () => {
    esClient.indices.simulateTemplate.mockImplementation(async () => simulateTemplateResponse);
    esClient.indices.putIndexTemplate
      .mockRejectedValueOnce(new EsErrors.ConnectionError('foo'))
      .mockRejectedValueOnce(new EsErrors.TimeoutError('timeout'))
      .mockResolvedValue({ acknowledged: true });
    await createOrUpdateIndexTemplate({ logger, esClient, template: getIndexTemplate() });

    expect(esClient.indices.putIndexTemplate).toHaveBeenCalledTimes(3);
  });

  it(`should retry simulateTemplate on transient ES errors`, async () => {
    esClient.indices.simulateTemplate
      .mockRejectedValueOnce(new EsErrors.ConnectionError('foo'))
      .mockRejectedValueOnce(new EsErrors.TimeoutError('timeout'))
      .mockImplementation(async () => simulateTemplateResponse);
    esClient.indices.putIndexTemplate.mockResolvedValue({ acknowledged: true });
    await createOrUpdateIndexTemplate({ logger, esClient, template: getIndexTemplate });

    expect(esClient.indices.simulateTemplate).toHaveBeenCalledTimes(3);
  });

  it(`should log and throw error if max retries exceeded`, async () => {
    esClient.indices.simulateTemplate.mockImplementation(async () => simulateTemplateResponse);
    esClient.indices.putIndexTemplate.mockRejectedValue(new EsErrors.ConnectionError('foo'));
    await expect(() =>
      createOrUpdateIndexTemplate({ logger, esClient, template: getIndexTemplate() })
    ).rejects.toThrowErrorMatchingInlineSnapshot(`"foo"`);

    expect(logger.error).toHaveBeenCalledWith(
      `Error installing index template .alerts-test.alerts-default-index-template - foo`,
      expect.any(Error)
    );
    expect(esClient.indices.putIndexTemplate).toHaveBeenCalledTimes(4);
  });

  it(`should log and throw error if ES throws error`, async () => {
    esClient.indices.simulateTemplate.mockImplementation(async () => simulateTemplateResponse);
    esClient.indices.putIndexTemplate.mockRejectedValue(new Error('generic error'));

    await expect(() =>
      createOrUpdateIndexTemplate({ logger, esClient, template: getIndexTemplate() })
    ).rejects.toThrowErrorMatchingInlineSnapshot(`"generic error"`);

    expect(logger.error).toHaveBeenCalledWith(
      `Error installing index template .alerts-test.alerts-default-index-template - generic error`,
      expect.any(Error)
    );
  });

  it(`should log and return without updating template if simulate throws error`, async () => {
    esClient.indices.simulateTemplate.mockRejectedValue(new Error('simulate error'));
    esClient.indices.putIndexTemplate.mockRejectedValue(new Error('generic error'));

    await createOrUpdateIndexTemplate({ logger, esClient, template: getIndexTemplate() });

    expect(logger.error).toHaveBeenCalledWith(
      `Failed to simulate index template mappings for .alerts-test.alerts-default-index-template; not applying mappings - simulate error`,
      expect.any(Error)
    );
    expect(esClient.indices.putIndexTemplate).not.toHaveBeenCalled();
  });

  it(`should throw error if simulate returns empty mappings`, async () => {
    esClient.indices.simulateTemplate.mockImplementationOnce(async () => ({
      ...simulateTemplateResponse,
      template: {
        ...simulateTemplateResponse.template,
        mappings: {},
      },
    }));

    await expect(() =>
      createOrUpdateIndexTemplate({ logger, esClient, template: getIndexTemplate() })
    ).rejects.toThrowErrorMatchingInlineSnapshot(
      `"No mappings would be generated for .alerts-test.alerts-default-index-template, possibly due to failed/misconfigured bootstrapping"`
    );
    expect(esClient.indices.putIndexTemplate).not.toHaveBeenCalled();
  });
});
