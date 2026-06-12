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

describe('esArchiver: index template', () => {
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

      const template = await getIndexTemplate(client, 'template-foo');

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

      const template = await getIndexTemplate(client, 'template-foo');

      expect(template).toEqual({
        name: 'template-foo',
        index_patterns: ['pattern-*'],
        template: {
          aliases: { 'foo-alias': {} },
          mappings: { properties: { foo: { type: 'keyword' } } },
        },
      });
    });
  });
});
