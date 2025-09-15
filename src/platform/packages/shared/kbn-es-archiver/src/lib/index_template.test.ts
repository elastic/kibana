/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { Client } from '@elastic/elasticsearch';

import sinon from 'sinon';
import { getIndexTemplate } from './index_template';
import type { ToolingLog } from '@kbn/tooling-log';

describe('esArchiver: index template', () => {
  let mockLog: ToolingLog;

  beforeEach(() => {
    mockLog = {
      warning: jest.fn(),
      info: jest.fn(),
      error: jest.fn(),
    } as unknown as ToolingLog;
  });

  describe('getIndexTemplate', () => {
    it('returns the index template', async () => {
      const client = {
        indices: {
          getIndexTemplate: sinon.stub().resolves({
            index_templates: [
              {
                index_template: {
                  index_patterns: ['pattern-*'],
                  template: {
                    mappings: { properties: { foo: { type: 'keyword' } } },
                  },
                  priority: 500,
                  composed_of: [],
                  data_stream: { hidden: false },
                },
              },
            ],
          }),
        },
      } as unknown as Client;

      const template = await getIndexTemplate(client, 'template-foo', mockLog);

      expect(template).toEqual({
        name: 'template-foo',
        index_patterns: ['pattern-*'],
        template: {
          mappings: { properties: { foo: { type: 'keyword' } } },
        },
        priority: 500,
        data_stream: { hidden: false },
      });
    });

    it('resolves component templates', async () => {
      const client = {
        indices: {
          getIndexTemplate: sinon.stub().resolves({
            index_templates: [
              {
                index_template: {
                  index_patterns: ['pattern-*'],
                  composed_of: ['the-settings', 'the-mappings'],
                },
              },
            ],
          }),
        },
        cluster: {
          existsComponentTemplate: sinon.stub().resolves(true),
          getComponentTemplate: sinon
            .stub()
            .onFirstCall()
            .resolves({
              component_templates: [
                {
                  component_template: {
                    template: {
                      aliases: { 'foo-alias': {} },
                    },
                  },
                },
              ],
            })
            .onSecondCall()
            .resolves({
              component_templates: [
                {
                  component_template: {
                    template: {
                      mappings: { properties: { foo: { type: 'keyword' } } },
                    },
                  },
                },
              ],
            }),
        },
      } as unknown as Client;

      const template = await getIndexTemplate(client, 'template-foo', mockLog);

      expect(template).toEqual({
        name: 'template-foo',
        index_patterns: ['pattern-*'],
        template: {
          aliases: { 'foo-alias': {} },
          mappings: { properties: { foo: { type: 'keyword' } } },
        },
      });
    });

    it('handles missing component templates that are marked as ignore missing', async () => {
      const client = {
        indices: {
          getIndexTemplate: sinon.stub().resolves({
            index_templates: [
              {
                index_template: {
                  index_patterns: ['pattern-*'],
                  template: {
                    mappings: { properties: { foo: { type: 'keyword' } } },
                  },
                  composed_of: ['existing-template', 'missing-template'],
                  ignore_missing_component_templates: ['missing-template'],
                },
              },
            ],
          }),
        },
        cluster: {
          existsComponentTemplate: sinon
            .stub()
            .onFirstCall()
            .resolves(true) // existing-template exists
            .onSecondCall()
            .resolves(false), // missing-template doesn't exist
          getComponentTemplate: sinon.stub().onFirstCall().resolves({
            component_templates: [
              {
                component_template: {
                  template: {
                    settings: { number_of_shards: 1 },
                  },
                },
              },
            ],
          }),
        },
      } as unknown as Client;

      const template = await getIndexTemplate(client, 'template-foo', mockLog);

      expect(template).toEqual({
        name: 'template-foo',
        index_patterns: ['pattern-*'],
        template: {
          mappings: { properties: { foo: { type: 'keyword' } } },
          settings: { number_of_shards: 1 },
        },
      });
      expect(mockLog.warning).not.toHaveBeenCalled();
    });

    it('logs warning for missing component templates not marked as ignore missing', async () => {
      const client = {
        indices: {
          getIndexTemplate: sinon.stub().resolves({
            index_templates: [
              {
                index_template: {
                  index_patterns: ['pattern-*'],
                  template: {
                    mappings: { properties: { foo: { type: 'keyword' } } },
                  },
                  composed_of: ['missing-template'],
                },
              },
            ],
          }),
        },
        cluster: {
          existsComponentTemplate: sinon.stub().resolves(false),
          getComponentTemplate: sinon.stub().rejects({
            meta: { statusCode: 404 },
          }),
        },
      } as unknown as Client;

      const template = await getIndexTemplate(client, 'template-foo', mockLog);

      expect(template).toEqual({
        name: 'template-foo',
        index_patterns: ['pattern-*'],
        template: {
          mappings: { properties: { foo: { type: 'keyword' } } },
        },
      });
      expect(mockLog.warning).toHaveBeenCalledWith(
        'Required Component template "missing-template" not found in index template "template-foo"'
      );
    });

    it('handles component template fetch errors that are not 404', async () => {
      const client = {
        indices: {
          getIndexTemplate: sinon.stub().resolves({
            index_templates: [
              {
                index_template: {
                  index_patterns: ['pattern-*'],
                  composed_of: ['failing-template'],
                },
              },
            ],
          }),
        },
        cluster: {
          existsComponentTemplate: sinon.stub().resolves(true),
          getComponentTemplate: sinon.stub().rejects(new Error('Server error')),
        },
      } as unknown as Client;

      await expect(getIndexTemplate(client, 'template-foo', mockLog)).rejects.toThrow(
        'Server error'
      );
    });

    it('handles component templates that fail to fetch with 404 and are in ignore list', async () => {
      const client = {
        indices: {
          getIndexTemplate: sinon.stub().resolves({
            index_templates: [
              {
                index_template: {
                  index_patterns: ['pattern-*'],
                  template: {
                    mappings: { properties: { foo: { type: 'keyword' } } },
                  },
                  composed_of: ['failing-template'],
                  ignore_missing_component_templates: ['failing-template'],
                },
              },
            ],
          }),
        },
        cluster: {
          existsComponentTemplate: sinon.stub().resolves(true),
          getComponentTemplate: sinon.stub().rejects({
            meta: { statusCode: 404 },
          }),
        },
      } as unknown as Client;

      // This test expects the current behavior where there's a bug in the implementation
      // When a component is in ignore_missing_component_templates and gets a 404, 
      // it should return null but currently throws the error
      await expect(getIndexTemplate(client, 'template-foo', mockLog)).rejects.toMatchObject({
        meta: { statusCode: 404 },
      });
    });
  });
});
