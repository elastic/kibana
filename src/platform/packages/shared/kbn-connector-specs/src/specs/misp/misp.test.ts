/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ActionContext } from '../../connector_spec';
import { getConnectorSpec } from '../../..';
import { Misp } from './misp';
import {
  AddSightingInputSchema,
  CheckIndicatorInputSchema,
  CreateEventInputSchema,
  SearchAttributesInputSchema,
} from './types';

const BASE_URL = 'https://misp.example.com';
const jsonHeaders = {
  Accept: 'application/json',
  'Content-Type': 'application/json',
};

describe('Misp', () => {
  const mockClient = {
    get: jest.fn(),
    post: jest.fn(),
  };

  const mockContext = {
    client: mockClient,
    config: { url: `${BASE_URL}/` },
    log: { debug: jest.fn(), error: jest.fn() },
  } as unknown as ActionContext;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('is discoverable via getConnectorSpec', () => {
    const spec = getConnectorSpec('.misp');
    expect(spec).toBe(Misp);
    expect(spec?.actions.searchAttributes).toBeDefined();
    expect(spec?.actions.createEvent.isTool).toBe(true);
  });

  it('has expected metadata and auth', () => {
    expect(Misp.metadata.id).toBe('.misp');
    expect(Misp.metadata.displayName).toBe('MISP');
    expect(Misp.metadata.minimumLicense).toBe('gold');
    expect(Misp.metadata.isTechnicalPreview).toBe(true);
    expect(Misp.metadata.supportedFeatureIds).toEqual(['workflows', 'agentBuilder']);
    expect(Misp.test?.enabled).toBe(true);

    const types = (Misp.auth?.types as Array<string | { type: string }>).map((t) =>
      typeof t === 'string' ? t : t.type
    );
    expect(types).toEqual(['api_key_header_with_tls']);
  });

  describe('input schemas', () => {
    it('defaults searchAttributes limit and page', () => {
      expect(SearchAttributesInputSchema.parse({ value: '1.2.3.4' })).toEqual({
        value: '1.2.3.4',
        limit: 10,
        page: 1,
      });
    });

    it('requires checkIndicator value', () => {
      expect(CheckIndicatorInputSchema.safeParse({}).success).toBe(false);
    });

    it('rejects addSighting without attributeId or value at the schema', () => {
      expect(AddSightingInputSchema.safeParse({}).success).toBe(false);
    });

    it('defaults createEvent published to false', () => {
      expect(CreateEventInputSchema.parse({ info: 'Alert' })).toEqual({
        info: 'Alert',
        published: false,
      });
    });
  });

  describe('searchAttributes', () => {
    it('posts restSearch and normalizes attribute list', async () => {
      mockClient.post.mockResolvedValue({
        data: { response: { Attribute: [{ id: '1', value: '1.2.3.4' }] } },
      });

      const result = await Misp.actions.searchAttributes.handler(mockContext, {
        value: '1.2.3.4',
        type: 'ip-dst',
        limit: 5,
        page: 2,
      });

      expect(mockClient.post).toHaveBeenCalledWith(
        `${BASE_URL}/attributes/restSearch`,
        {
          returnFormat: 'json',
          value: '1.2.3.4',
          type: 'ip-dst',
          limit: 5,
          page: 2,
        },
        { headers: jsonHeaders }
      );
      expect(result).toEqual({
        count: 1,
        attributes: [{ id: '1', value: '1.2.3.4' }],
      });
    });
  });

  describe('checkIndicator', () => {
    it('returns unknown when MISP has no matches', async () => {
      mockClient.post.mockResolvedValue({ data: { response: { Attribute: [] } } });

      const result = await Misp.actions.checkIndicator.handler(mockContext, {
        value: 'evil.example',
      });

      expect(result).toMatchObject({
        value: 'evil.example',
        found: false,
        verdict: 'unknown',
        matchCount: 0,
        toIds: null,
      });
    });

    it('returns malicious when any match has to_ids', async () => {
      mockClient.post.mockResolvedValue({
        data: {
          response: {
            Attribute: [
              { value: 'evil.example', to_ids: true },
              { value: 'evil.example', to_ids: false },
            ],
          },
        },
      });

      const result = await Misp.actions.checkIndicator.handler(mockContext, {
        value: 'evil.example',
        type: 'domain',
      });

      expect(result.verdict).toBe('malicious');
      expect(result.found).toBe(true);
      expect(result.toIds).toBe(true);
    });

    it('returns known when matches exist without to_ids', async () => {
      mockClient.post.mockResolvedValue({
        data: { response: { Attribute: [{ value: 'cdn.example', to_ids: false }] } },
      });

      const result = await Misp.actions.checkIndicator.handler(mockContext, {
        value: 'cdn.example',
      });

      expect(result.verdict).toBe('known');
      expect(result.toIds).toBe(false);
    });
  });

  describe('write actions', () => {
    it('addSighting sends id for numeric attribute ids and uuid for UUIDs', async () => {
      mockClient.post.mockResolvedValue({ data: { Sighting: { id: '1' } } });

      await Misp.actions.addSighting.handler(mockContext, {
        attributeId: '42',
        type: 0,
      });
      await Misp.actions.addSighting.handler(mockContext, {
        attributeId: '6116c23d-d035-4e94-a110-bc940b73b9df',
        type: 0,
        source: 'kibana',
      });

      expect(mockClient.post).toHaveBeenNthCalledWith(
        1,
        `${BASE_URL}/sightings/add`,
        { type: 0, id: '42' },
        { headers: jsonHeaders }
      );
      expect(mockClient.post).toHaveBeenNthCalledWith(
        2,
        `${BASE_URL}/sightings/add`,
        {
          type: 0,
          uuid: '6116c23d-d035-4e94-a110-bc940b73b9df',
          source: 'kibana',
        },
        { headers: jsonHeaders }
      );
    });

    it('createEvent posts Event payload', async () => {
      mockClient.post.mockResolvedValue({ data: { Event: { id: '9', info: 'Alert' } } });

      const result = await Misp.actions.createEvent.handler(mockContext, {
        info: 'Alert',
        threatLevelId: 2,
        published: false,
      });

      expect(mockClient.post).toHaveBeenCalledWith(
        `${BASE_URL}/events/add`,
        {
          Event: {
            info: 'Alert',
            published: false,
            threat_level_id: 2,
          },
        },
        { headers: jsonHeaders }
      );
      expect(result).toEqual({ Event: { id: '9', info: 'Alert' } });
    });

    it('addAttribute posts to event path', async () => {
      mockClient.post.mockResolvedValue({ data: { Attribute: { id: '3' } } });

      await Misp.actions.addAttribute.handler(mockContext, {
        eventId: '9',
        type: 'ip-dst',
        value: '1.2.3.4',
        toIds: true,
      });

      expect(mockClient.post).toHaveBeenCalledWith(
        `${BASE_URL}/attributes/add/9`,
        {
          type: 'ip-dst',
          value: '1.2.3.4',
          to_ids: true,
        },
        { headers: jsonHeaders }
      );
    });

    it('publishEvent and addTagToEvent hit the expected endpoints', async () => {
      mockClient.post.mockResolvedValue({ data: { success: true } });

      await Misp.actions.publishEvent.handler(mockContext, { eventId: '9' });
      await Misp.actions.addTagToEvent.handler(mockContext, {
        eventId: '9',
        tag: 'tlp:amber',
      });

      expect(mockClient.post).toHaveBeenNthCalledWith(
        1,
        `${BASE_URL}/events/publish/9`,
        {},
        { headers: jsonHeaders }
      );
      expect(mockClient.post).toHaveBeenNthCalledWith(
        2,
        `${BASE_URL}/events/addTag`,
        { event: '9', tag: 'tlp:amber' },
        { headers: jsonHeaders }
      );
    });
  });

  describe('test', () => {
    it('calls getVersion and returns version', async () => {
      if (!Misp.test) {
        throw new Error('Misp.test is not defined');
      }
      mockClient.get.mockResolvedValue({ data: { version: '2.5.0' } });

      await expect(Misp.test.handler(mockContext)).resolves.toEqual({ version: '2.5.0' });
      expect(mockClient.get).toHaveBeenCalledWith(`${BASE_URL}/servers/getVersion`, {
        headers: jsonHeaders,
      });
    });

    it('requires url config', async () => {
      if (!Misp.test) {
        throw new Error('Misp.test is not defined');
      }
      const noUrl = {
        ...mockContext,
        config: {},
      } as unknown as ActionContext;

      await expect(Misp.test.handler(noUrl)).rejects.toThrow(
        'missing the required URL configuration field'
      );
    });
  });
});
