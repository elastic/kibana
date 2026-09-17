/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { z } from '@kbn/zod/v4';
import { fromJSONSchema } from '@kbn/zod/v4/from_json_schema';
import * as connectorsSpecs from '../all_specs';
import type { ConnectorSpec } from '../connector_spec';
import { serializeConnectorSpecCatalogEntry } from './serialize_connector_spec_catalog';

describe('serializeConnectorSpecCatalogEntry', () => {
  it('serializes action input JSON Schema without handler-like keys', () => {
    const spec: ConnectorSpec = {
      metadata: {
        id: '.test-catalog',
        displayName: 'Test Catalog',
        description: 'Test',
        minimumLicense: 'basic',
        supportedFeatureIds: ['workflows'],
      },
      actions: {
        lookup: {
          isTool: true,
          description: 'Look up an indicator',
          input: z.object({
            indicator: z.string().describe('Indicator value'),
            section: z.string().optional(),
          }),
          scope: 'read',
          handler: async () => ({ ok: true }),
        },
      },
      test: { handler: async () => ({}), enabled: false },
    };

    const result = serializeConnectorSpecCatalogEntry(spec);

    expect(result.id).toBe('.test-catalog');
    expect(result.metadata).toEqual(spec.metadata);
    expect(result.isInboundOnly).toBe(false);
    expect(result.actions.lookup.isTool).toBe(true);
    expect(result.actions.lookup.description).toBe('Look up an indicator');
    expect(JSON.stringify(result)).not.toMatch(/handler/);
    expect(result.actions.lookup).not.toHaveProperty('handler');
  });

  it('round-trips a real spec action input through fromJSONSchema', () => {
    const spec = connectorsSpecs.AlienVaultOTXConnector;
    const serialized = serializeConnectorSpecCatalogEntry(spec);
    const getIndicator = serialized.actions.getIndicator;
    expect(getIndicator).toBeDefined();

    const rehydrated = fromJSONSchema(getIndicator.inputJsonSchema, { preserveMeta: true });
    expect(rehydrated).toBeInstanceOf(z.ZodObject);

    const shape = (rehydrated as z.ZodObject).shape;
    expect(Object.keys(shape)).toEqual(expect.arrayContaining(['indicatorType', 'indicator']));
    expect(shape).toHaveProperty('indicator');
    expect(shape).toHaveProperty('indicatorType');

    const jsonSchema = getIndicator.inputJsonSchema as {
      required?: string[];
      properties?: Record<string, { description?: string }>;
    };
    expect(jsonSchema.required).toEqual(expect.arrayContaining(['indicatorType', 'indicator']));
    expect(jsonSchema.properties?.indicator?.description).toBe('Indicator value');
  });

  it('serializes inbound event definitions without handleEvents', () => {
    const spec: ConnectorSpec = {
      metadata: {
        id: '.inbound-catalog',
        displayName: 'Inbound',
        description: 'Events only',
        minimumLicense: 'gold',
        supportedFeatureIds: ['workflows'],
      },
      actions: {},
      test: { handler: async () => ({}), enabled: false },
      events: {
        definitions: {
          received: {
            eventId: 'inbound.received',
            title: 'Received',
            description: 'Inbound payload received',
            eventSchema: z.object({
              body: z.unknown().describe('Raw request body'),
            }),
          },
        },
        handleEvents: async () => ({ type: 'http', httpResponse: { status: 200 } }),
      },
    };

    const result = serializeConnectorSpecCatalogEntry(spec);

    expect(result.isInboundOnly).toBe(true);
    expect(result.events?.definitions).toHaveLength(1);
    expect(result.events?.definitions[0].eventId).toBe('inbound.received');
    expect(JSON.stringify(result)).not.toMatch(/handleEvents/);
  });
});
