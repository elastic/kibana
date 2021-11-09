/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { CustomIntegrationsPlugin } from './plugin';

import { coreMock } from '../../../core/server/mocks';

describe('CustomIntegrationsPlugin', () => {
  beforeEach(() => {});

  describe('setup', () => {
    let mockCoreSetup: ReturnType<typeof coreMock.createSetup>;
    let initContext: ReturnType<typeof coreMock.createPluginInitializerContext>;

    beforeEach(() => {
      mockCoreSetup = coreMock.createSetup();
      initContext = coreMock.createPluginInitializerContext();
    });

    test('should return setup contract', () => {
      const setup = new CustomIntegrationsPlugin(initContext).setup(mockCoreSetup);
      expect(setup).toHaveProperty('registerCustomIntegration');
      expect(setup).toHaveProperty('getAppendCustomIntegrations');
    });

    test('should register language clients', () => {
      const setup = new CustomIntegrationsPlugin(initContext).setup(mockCoreSetup);
      expect(setup.getAppendCustomIntegrations()).toEqual([
        {
          id: 'language_client.javascript',
          title: 'Elasticsearch JavaScript Client',
          description: 'Index data to Elasticsearch with the JavaScript client.',
          type: 'ui_link',
          shipper: 'language_clients',
          uiInternalPath:
            'https://www.elastic.co/guide/en/elasticsearch/client/javascript-api/branch/introduction.html',
          isBeta: false,
          icons: [{ type: 'svg' }],
          categories: ['elastic_stack', 'custom', 'language_client'],
        },
        {
          id: 'language_client.ruby',
          title: 'Elasticsearch Ruby Client',
          description: 'Index data to Elasticsearch with the Ruby client.',
          type: 'ui_link',
          shipper: 'language_clients',
          uiInternalPath:
            'https://www.elastic.co/guide/en/elasticsearch/client/ruby-api/branch/ruby_client.html',
          isBeta: false,
          icons: [{ type: 'svg' }],
          categories: ['elastic_stack', 'custom', 'language_client'],
        },
        {
          id: 'language_client.go',
          title: 'Elasticsearch Go Client',
          description: 'Index data to Elasticsearch with the Go client.',
          type: 'ui_link',
          shipper: 'language_clients',
          uiInternalPath:
            'https://www.elastic.co/guide/en/elasticsearch/client/go-api/branch/overview.html',
          isBeta: false,
          icons: [{ type: 'svg' }],
          categories: ['elastic_stack', 'custom', 'language_client'],
        },
        {
          id: 'language_client.dotnet',
          title: 'Elasticsearch .NET Client',
          description: 'Index data to Elasticsearch with the .NET client.',
          type: 'ui_link',
          shipper: 'language_clients',
          uiInternalPath:
            'https://www.elastic.co/guide/en/elasticsearch/client/net-api/branch/index.html',
          isBeta: false,
          icons: [{ type: 'svg' }],
          categories: ['elastic_stack', 'custom', 'language_client'],
        },
        {
          id: 'language_client.php',
          title: 'Elasticsearch PHP Client',
          description: 'Index data to Elasticsearch with the PHP client.',
          type: 'ui_link',
          shipper: 'language_clients',
          uiInternalPath:
            'https://www.elastic.co/guide/en/elasticsearch/client/php-api/branch/index.html',
          isBeta: false,
          icons: [{ type: 'svg' }],
          categories: ['elastic_stack', 'custom', 'language_client'],
        },
        {
          id: 'language_client.perl',
          title: 'Elasticsearch Perl Client',
          description: 'Index data to Elasticsearch with the Perl client.',
          type: 'ui_link',
          shipper: 'language_clients',
          uiInternalPath:
            'https://www.elastic.co/guide/en/elasticsearch/client/perl-api/branch/index.html',
          isBeta: false,
          icons: [{ type: 'svg' }],
          categories: ['elastic_stack', 'custom', 'language_client'],
        },
        {
          id: 'language_client.python',
          title: 'Elasticsearch Python Client',
          description: 'Index data to Elasticsearch with the Python client.',
          type: 'ui_link',
          shipper: 'language_clients',
          uiInternalPath:
            'https://www.elastic.co/guide/en/elasticsearch/client/python-api/branch/index.html',
          isBeta: false,
          icons: [{ type: 'svg' }],
          categories: ['elastic_stack', 'custom', 'language_client'],
        },
        {
          id: 'language_client.rust',
          title: 'Elasticsearch Rust Client',
          description: 'Index data to Elasticsearch with the Rust client.',
          type: 'ui_link',
          shipper: 'language_clients',
          uiInternalPath:
            'https://www.elastic.co/guide/en/elasticsearch/client/rust-api/branch/index.html',
          isBeta: false,
          icons: [{ type: 'svg' }],
          categories: ['elastic_stack', 'custom', 'language_client'],
        },
        {
          id: 'language_client.java',
          title: 'Elasticsearch Java Client',
          description: 'Index data to Elasticsearch with the Java client.',
          type: 'ui_link',
          shipper: 'language_clients',
          uiInternalPath:
            'https://www.elastic.co/guide/en/elasticsearch/client/java-api-client/branch/index.html',
          isBeta: false,
          icons: [{ type: 'svg' }],
          categories: ['elastic_stack', 'custom', 'language_client'],
        },
      ]);
    });
  });
});
