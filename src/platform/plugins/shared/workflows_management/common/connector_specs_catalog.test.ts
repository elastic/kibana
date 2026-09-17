/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { INBOUND_WEBHOOK_CONNECTOR_TYPE_ID } from '@kbn/connector-specs-common';
import {
  applyConnectorSpecsCatalog,
  ConnectorSpecsInputSchemas,
  ensureConnectorSpecsCatalogLoaded,
  getConnectorSpecsCatalog,
  inboundOnlyConnectorTypeIds,
  rehydrateConnectorSpecsCatalog,
  resetConnectorSpecsCatalog,
} from './connector_specs_catalog';

describe('connector specs catalog', () => {
  afterEach(() => {
    resetConnectorSpecsCatalog();
  });

  it('starts empty', () => {
    expect(getConnectorSpecsCatalog()).toEqual([]);
    expect(ConnectorSpecsInputSchemas.size).toBe(0);
    expect(inboundOnlyConnectorTypeIds.size).toBe(0);
  });

  it('rehydrates a bulk catalog response into action input schemas', () => {
    const [entry] = rehydrateConnectorSpecsCatalog([
      {
        id: '.alienvault-otx',
        isInboundOnly: false,
        actions: {
          getIndicator: {
            description: 'Get indicator',
            inputJsonSchema: {
              type: 'object',
              properties: {
                indicator: { type: 'string', description: 'Indicator value' },
              },
              required: ['indicator'],
            },
          },
        },
      },
    ]);

    applyConnectorSpecsCatalog([entry]);

    expect(ConnectorSpecsInputSchemas.size).toBe(1);
    const actions = ConnectorSpecsInputSchemas.get('.alienvault-otx');
    expect(actions).toBeDefined();
    expect(actions!.getIndicator.parse({ indicator: '8.8.8.8' })).toEqual({
      indicator: '8.8.8.8',
    });
    expect(() => actions!.getIndicator.parse({})).toThrow();
    expect(inboundOnlyConnectorTypeIds.has('.alienvault-otx')).toBe(false);
  });

  it('records inbound-only connector type ids', () => {
    applyConnectorSpecsCatalog(
      rehydrateConnectorSpecsCatalog([
        {
          id: INBOUND_WEBHOOK_CONNECTOR_TYPE_ID,
          isInboundOnly: true,
          actions: {},
          events: {
            definitions: [
              {
                eventId: 'inboundWebhook.received',
                title: 'Received',
                description: 'Inbound payload',
                eventJsonSchema: {
                  type: 'object',
                  properties: { body: {} },
                },
              },
            ],
          },
        },
      ])
    );

    expect(inboundOnlyConnectorTypeIds.has(INBOUND_WEBHOOK_CONNECTOR_TYPE_ID)).toBe(true);
    expect(ConnectorSpecsInputSchemas.get(INBOUND_WEBHOOK_CONNECTOR_TYPE_ID)).toEqual({});
  });

  it('loads a bulk response through ensureConnectorSpecsCatalogLoaded', async () => {
    const catalog = await ensureConnectorSpecsCatalogLoaded(async () => [
      {
        id: '.slack',
        isInboundOnly: false,
        actions: {
          postMessage: {
            inputJsonSchema: {
              type: 'object',
              properties: { text: { type: 'string' } },
              required: ['text'],
            },
          },
        },
      },
    ]);

    expect(catalog).toHaveLength(1);
    expect(getConnectorSpecsCatalog()).toBe(catalog);
    expect(ConnectorSpecsInputSchemas.get('.slack')!.postMessage.parse({ text: 'hi' })).toEqual({
      text: 'hi',
    });
  });
});
