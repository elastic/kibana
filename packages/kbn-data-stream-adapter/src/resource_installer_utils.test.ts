/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { getIndexTemplate, getComponentTemplate } from './resource_installer_utils';

describe('getIndexTemplate', () => {
  const defaultParams = {
    name: 'indexTemplateName',
    kibanaVersion: '8.12.1',
    indexPatterns: ['indexPattern1', 'indexPattern2'],
    componentTemplateRefs: ['template1', 'template2'],
    totalFieldsLimit: 2500,
  };

  it('should create index template with given parameters and defaults', () => {
    const indexTemplate = getIndexTemplate(defaultParams);

    expect(indexTemplate).toEqual({
      name: defaultParams.name,
      body: {
        data_stream: { hidden: true },
        index_patterns: defaultParams.indexPatterns,
        composed_of: defaultParams.componentTemplateRefs,
        template: {
          settings: {
            hidden: true,
            auto_expand_replicas: '0-1',
            'index.mapping.ignore_malformed': true,
            'index.mapping.total_fields.limit': defaultParams.totalFieldsLimit,
          },
          mappings: {
            dynamic: false,
            _meta: {
              kibana: {
                version: defaultParams.kibanaVersion,
              },
              managed: true,
              namespace: 'default',
            },
          },
        },
        _meta: {
          kibana: {
            version: defaultParams.kibanaVersion,
          },
          managed: true,
          namespace: 'default',
        },
        priority: 7,
      },
    });
  });

  it('should create not hidden index template', () => {
    const { body } = getIndexTemplate({ ...defaultParams, hidden: false });
    expect(body?.data_stream?.hidden).toEqual(false);
    expect(body?.template?.settings?.hidden).toEqual(false);
  });

  it('should create index template with custom namespace', () => {
    const { body } = getIndexTemplate({ ...defaultParams, namespace: 'custom-namespace' });
    expect(body?._meta?.namespace).toEqual('custom-namespace');
    expect(body?.priority).toEqual(16);
  });

  it('should create index template with template overrides', () => {
    const { body } = getIndexTemplate({
      ...defaultParams,
      template: {
        settings: {
          number_of_shards: 1,
        },
        mappings: {
          dynamic: true,
        },
        lifecycle: {
          data_retention: '30d',
        },
      },
    });

    expect(body?.template?.settings).toEqual({
      hidden: true,
      auto_expand_replicas: '0-1',
      'index.mapping.ignore_malformed': true,
      'index.mapping.total_fields.limit': defaultParams.totalFieldsLimit,
      number_of_shards: 1,
    });

    expect(body?.template?.mappings).toEqual({
      dynamic: true,
      _meta: {
        kibana: {
          version: defaultParams.kibanaVersion,
        },
        managed: true,
        namespace: 'default',
      },
    });

    expect(body?.template?.lifecycle).toEqual({
      data_retention: '30d',
    });
  });
});

describe('getComponentTemplate', () => {
  const defaultParams = {
    name: 'componentTemplateName',
    kibanaVersion: '8.12.1',
    fieldMap: {
      field1: { type: 'text', required: true },
      field2: { type: 'keyword', required: false },
    },
  };

  it('should create component template with given parameters and defaults', () => {
    const componentTemplate = getComponentTemplate(defaultParams);

    expect(componentTemplate).toEqual({
      name: defaultParams.name,
      _meta: {
        managed: true,
      },
      template: {
        settings: {
          number_of_shards: 1,
          'index.mapping.total_fields.limit': 1500,
        },
        mappings: {
          dynamic: 'strict',
          properties: {
            field1: {
              type: 'text',
            },
            field2: {
              type: 'keyword',
            },
          },
        },
      },
    });
  });

  it('should create component template with custom settings', () => {
    const { template } = getComponentTemplate({
      ...defaultParams,
      settings: {
        number_of_shards: 1,
        number_of_replicas: 1,
      },
    });

    expect(template.settings).toEqual({
      number_of_shards: 1,
      number_of_replicas: 1,
      'index.mapping.total_fields.limit': 1500,
    });
  });

  it('should create component template with custom dynamic', () => {
    const { template } = getComponentTemplate({ ...defaultParams, dynamic: true });
    expect(template.mappings?.dynamic).toEqual(true);
  });
});
