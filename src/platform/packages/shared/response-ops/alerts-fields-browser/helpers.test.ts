/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { mockBrowserFields } from './mock';

import {
  categoryHasFields,
  getCategory,
  getDescription,
  getFieldCount,
  filterBrowserFieldsByFieldName,
  filterSelectedBrowserFields,
} from './helpers';
import type { BrowserFields } from '@kbn/rule-registry-plugin/common';
import { EcsFlat } from '@elastic/ecs';

describe('helpers', () => {
  describe('getCategory', () => {
    test('it returns "host" category for given name host.hostname', () => {
      const category = getCategory('host.hostname');
      expect(category).toEqual('host');
    });
    test('it returns "base" category for given name _id', () => {
      const category = getCategory('_id');
      expect(category).toEqual('base');
    });
    test('it returns "base" category for given name @timestamp', () => {
      const category = getCategory('@timestamp');
      expect(category).toEqual('base');
    });
    test('it returns "(unknown)" category for null field', () => {
      // @ts-expect-error cannot have 'null' for parameter
      const category = getCategory(null);
      expect(category).toEqual('(unknown)');
    });
  });
  describe('getDescription', () => {
    test('it returns description for given name', () => {
      const description = getDescription('host.hostname', EcsFlat);
      expect(description).toMatchInlineSnapshot(`
        "Hostname of the host.
        It normally contains what the \`hostname\` command returns on the host machine."
      `);
    });
  });

  describe('categoryHasFields', () => {
    test('it returns false if the category fields property is undefined', () => {
      expect(categoryHasFields({})).toBe(false);
    });

    test('it returns false if the category fields property is empty', () => {
      expect(categoryHasFields({ fields: {} })).toBe(false);
    });

    test('it returns true if the category has one field', () => {
      expect(
        categoryHasFields({
          fields: {
            'auditd.data.a0': {
              aggregatable: true,
              category: 'auditd',
              description: null,
              example: null,
              indexes: ['auditbeat'],
              name: 'auditd.data.a0',
              searchable: true,
              type: 'string',
            },
          },
        })
      ).toBe(true);
    });

    test('it returns true if the category has multiple fields', () => {
      expect(
        categoryHasFields({
          fields: {
            'agent.ephemeral_id': {
              aggregatable: true,
              category: 'agent',
              description:
                'Ephemeral identifier of this agent (if one exists). This id normally changes across restarts, but `agent.id` does not.',
              example: '8a4f500f',
              indexes: ['auditbeat', 'filebeat', 'packetbeat'],
              name: 'agent.ephemeral_id',
              searchable: true,
              type: 'string',
            },
            'agent.hostname': {
              aggregatable: true,
              category: 'agent',
              description: null,
              example: null,
              indexes: ['auditbeat', 'filebeat', 'packetbeat'],
              name: 'agent.hostname',
              searchable: true,
              type: 'string',
            },
          },
        })
      ).toBe(true);
    });
  });

  describe('getFieldCount', () => {
    test('it returns 0 if the category fields property is undefined', () => {
      expect(getFieldCount({})).toEqual(0);
    });

    test('it returns 0 if the category fields property is empty', () => {
      expect(getFieldCount({ fields: {} })).toEqual(0);
    });

    test('it returns 1 if the category has one field', () => {
      expect(
        getFieldCount({
          fields: {
            'auditd.data.a0': {
              aggregatable: true,
              category: 'auditd',
              description: null,
              example: null,
              indexes: ['auditbeat'],
              name: 'auditd.data.a0',
              searchable: true,
              type: 'string',
            },
          },
        })
      ).toEqual(1);
    });

    test('it returns the correct count when category has multiple fields', () => {
      expect(
        getFieldCount({
          fields: {
            'agent.ephemeral_id': {
              aggregatable: true,
              category: 'agent',
              description:
                'Ephemeral identifier of this agent (if one exists). This id normally changes across restarts, but `agent.id` does not.',
              example: '8a4f500f',
              indexes: ['auditbeat', 'filebeat', 'packetbeat'],
              name: 'agent.ephemeral_id',
              searchable: true,
              type: 'string',
            },
            'agent.hostname': {
              aggregatable: true,
              category: 'agent',
              description: null,
              example: null,
              indexes: ['auditbeat', 'filebeat', 'packetbeat'],
              name: 'agent.hostname',
              searchable: true,
              type: 'string',
            },
          },
        })
      ).toEqual(2);
    });
  });

  describe('filterBrowserFieldsByFieldName', () => {
    test('it returns an empty collection when browserFields is empty', () => {
      expect(filterBrowserFieldsByFieldName({ browserFields: {}, substring: '' })).toEqual({});
    });

    test('it returns an empty collection when browserFields is empty and substring is non empty', () => {
      expect(
        filterBrowserFieldsByFieldName({ browserFields: {}, substring: 'nothing to match' })
      ).toEqual({});
    });

    test('it returns an empty collection when browserFields is NOT empty and substring does not match any fields', () => {
      expect(
        filterBrowserFieldsByFieldName({
          browserFields: mockBrowserFields,
          substring: 'nothing to match',
        })
      ).toEqual({});
    });

    test('it returns the original collection when browserFields is NOT empty and substring is empty', () => {
      expect(
        filterBrowserFieldsByFieldName({
          browserFields: mockBrowserFields,
          substring: '',
        })
      ).toEqual(mockBrowserFields);
    });

    test('it returns (only) non-empty categories, where each category contains only the fields matching the substring', () => {
      const filtered: BrowserFields = {
        agent: {
          fields: {
            'agent.ephemeral_id': {
              aggregatable: true,
              category: 'agent',
              description:
                'Ephemeral identifier of this agent (if one exists). This id normally changes across restarts, but `agent.id` does not.',
              example: '8a4f500f',
              indexes: ['auditbeat', 'filebeat', 'packetbeat'],
              name: 'agent.ephemeral_id',
              searchable: true,
              type: 'string',
            },
            'agent.id': {
              aggregatable: true,
              category: 'agent',
              description:
                'Unique identifier of this agent (if one exists). Example: For Beats this would be beat.id.',
              example: '8a4f500d',
              indexes: ['auditbeat', 'filebeat', 'packetbeat'],
              name: 'agent.id',
              searchable: true,
              type: 'string',
            },
          },
        },
        base: {
          fields: {
            _id: {
              category: 'base',
              description: 'Each document has an _id that uniquely identifies it',
              example: 'Y-6TfmcB0WOhS6qyMv3s',
              name: '_id',
              type: 'string',
              searchable: true,
              aggregatable: false,
              indexes: ['auditbeat', 'filebeat', 'packetbeat'],
            },
          },
        },
        cloud: {
          fields: {
            'cloud.account.id': {
              aggregatable: true,
              category: 'cloud',
              description:
                'The cloud account or organization id used to identify different entities in a multi-tenant environment. Examples: AWS account id, Google Cloud ORG Id, or other unique identifier.',
              example: '666777888999',
              indexes: ['auditbeat', 'filebeat', 'packetbeat'],
              name: 'cloud.account.id',
              searchable: true,
              type: 'string',
            },
          },
        },
        container: {
          fields: {
            'container.id': {
              aggregatable: true,
              category: 'container',
              description: 'Unique container id.',
              example: null,
              indexes: ['auditbeat', 'filebeat', 'packetbeat'],
              name: 'container.id',
              searchable: true,
              type: 'string',
            },
          },
        },
        kibana: {
          fields: {
            'kibana.alert.case_ids': {
              name: 'kibana.alert.case_ids',
              type: 'string',
              searchable: true,
              aggregatable: true,
              readFromDocValues: true,
              category: 'kibana',
              format: { id: 'string' },
            },
          },
        },
      };

      expect(
        filterBrowserFieldsByFieldName({
          browserFields: mockBrowserFields,
          substring: 'id',
        })
      ).toEqual(filtered);
    });

    test.each(['cases', 'Cases', 'case', 'Case', 'ca'])(
      'it matches the cases label with search term: %s',
      (searchTerm) => {
        const casesField = {
          kibana: {
            fields: {
              'kibana.alert.case_ids': {
                name: 'kibana.alert.case_ids',
                type: 'string',
                searchable: true,
                aggregatable: true,
                readFromDocValues: true,
                category: 'kibana',
                format: { id: 'string' },
              },
            },
          },
        };

        expect(
          filterBrowserFieldsByFieldName({
            browserFields: { ...casesField, mockBrowserFields },
            substring: searchTerm,
          })
        ).toEqual(casesField);
      }
    );
  });

  describe('filterSelectedBrowserFields', () => {
    const columnIds = ['agent.ephemeral_id', 'agent.id', 'container.id'];

    test('it returns an empty collection when browserFields is empty', () => {
      expect(filterSelectedBrowserFields({ browserFields: {}, columnIds: [] })).toEqual({});
    });

    test('it returns an empty collection when browserFields is empty and columnIds is non empty', () => {
      expect(filterSelectedBrowserFields({ browserFields: {}, columnIds })).toEqual({});
    });

    test('it returns an empty collection when browserFields is NOT empty and columnIds is empty', () => {
      expect(
        filterSelectedBrowserFields({
          browserFields: mockBrowserFields,
          columnIds: [],
        })
      ).toEqual({});
    });

    test('it returns (only) non-empty categories, where each category contains only the fields matching the substring', () => {
      const filtered: BrowserFields = {
        agent: {
          fields: {
            'agent.ephemeral_id': {
              aggregatable: true,
              category: 'agent',
              description:
                'Ephemeral identifier of this agent (if one exists). This id normally changes across restarts, but `agent.id` does not.',
              example: '8a4f500f',
              indexes: ['auditbeat', 'filebeat', 'packetbeat'],
              name: 'agent.ephemeral_id',
              searchable: true,
              type: 'string',
            },
            'agent.id': {
              aggregatable: true,
              category: 'agent',
              description:
                'Unique identifier of this agent (if one exists). Example: For Beats this would be beat.id.',
              example: '8a4f500d',
              indexes: ['auditbeat', 'filebeat', 'packetbeat'],
              name: 'agent.id',
              searchable: true,
              type: 'string',
            },
          },
        },
        container: {
          fields: {
            'container.id': {
              aggregatable: true,
              category: 'container',
              description: 'Unique container id.',
              example: null,
              indexes: ['auditbeat', 'filebeat', 'packetbeat'],
              name: 'container.id',
              searchable: true,
              type: 'string',
            },
          },
        },
      };

      expect(
        filterSelectedBrowserFields({
          browserFields: mockBrowserFields,
          columnIds,
        })
      ).toEqual(filtered);
    });
  });
});
