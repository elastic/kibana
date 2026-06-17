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
import { TaxiiConnector } from './taxii';

describe('TaxiiConnector', () => {
  const mockClient = {
    get: jest.fn(),
    post: jest.fn(),
  };

  const baseContext: Partial<ActionContext> = {
    client: mockClient as unknown as ActionContext['client'],
    log: { debug: jest.fn(), error: jest.fn() } as unknown as ActionContext['log'],
    config: { serverUrl: 'https://taxii.example.com/api/v1/taxii2/' },
  };

  const ctx = baseContext as ActionContext;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('is registered in all_specs.ts under the .taxii id', () => {
    const spec = getConnectorSpec('.taxii');
    expect(spec).toBe(TaxiiConnector);
    expect(spec?.actions.pollCollection).toBeDefined();
    expect(spec?.actions.pollCollection.isTool).toBe(true);
  });

  it('has the expected metadata', () => {
    expect(TaxiiConnector.metadata.id).toBe('.taxii');
    expect(TaxiiConnector.metadata.minimumLicense).toBe('gold');
    expect(TaxiiConnector.metadata.isTechnicalPreview).toBe(true);
    expect(TaxiiConnector.metadata.supportedFeatureIds).toEqual(
      expect.arrayContaining(['workflows', 'agentBuilder'])
    );
  });

  it('exposes basic / bearer / api_key_header auth', () => {
    const types = (TaxiiConnector.auth?.types as Array<string | { type: string }>).map((t) =>
      typeof t === 'string' ? t : t.type
    );
    expect(types).toEqual(expect.arrayContaining(['basic', 'bearer', 'api_key_header']));
  });

  it('declares cursor-based pagination on `next` and a retry policy on rate-limit / timeout statuses', () => {
    expect(TaxiiConnector.policies?.pagination).toEqual({
      strategy: 'cursor',
      cursorParam: 'next',
      resultPath: 'objects',
    });
    expect(TaxiiConnector.policies?.retry?.retryOnStatusCodes).toEqual(
      expect.arrayContaining([408, 429, 503])
    );
  });

  describe('pollCollection action', () => {
    it('appends `objects/` to a collection URL and surfaces objects/more/next', async () => {
      mockClient.get.mockResolvedValue({
        data: {
          objects: [{ id: 'indicator--1', type: 'indicator' }],
          more: true,
          next: 'cursor-2',
        },
      });

      const result = await TaxiiConnector.actions.pollCollection.handler(ctx, {
        collectionUrl: 'https://taxii.example.com/api/v1/collections/abc/',
      });

      expect(mockClient.get).toHaveBeenCalledTimes(1);
      const calledUrl = mockClient.get.mock.calls[0][0] as string;
      expect(calledUrl).toBe('https://taxii.example.com/api/v1/collections/abc/objects/');
      expect(mockClient.get.mock.calls[0][1]).toEqual({
        headers: { Accept: 'application/taxii+json;version=2.1, application/json' },
      });
      expect(result).toEqual({
        objects: [{ id: 'indicator--1', type: 'indicator' }],
        more: true,
        next: 'cursor-2',
      });
    });

    it('passes addedAfter, limit, and next as query params', async () => {
      mockClient.get.mockResolvedValue({ data: { objects: [], more: false } });

      await TaxiiConnector.actions.pollCollection.handler(ctx, {
        collectionUrl: 'https://taxii.example.com/api/v1/collections/abc',
        addedAfter: '2026-01-01T00:00:00Z',
        limit: 500,
        next: 'cursor-prev',
      });

      const calledUrl = new URL(mockClient.get.mock.calls[0][0] as string);
      expect(calledUrl.searchParams.get('added_after')).toBe('2026-01-01T00:00:00Z');
      expect(calledUrl.searchParams.get('limit')).toBe('500');
      expect(calledUrl.searchParams.get('next')).toBe('cursor-prev');
    });

    it('returns empty defaults when the server returns a non-envelope payload', async () => {
      mockClient.get.mockResolvedValue({ data: 'not-json' });

      const result = await TaxiiConnector.actions.pollCollection.handler(ctx, {
        collectionUrl: 'https://taxii.example.com/api/v1/collections/abc/',
      });

      expect(result).toEqual({ objects: [], more: false, next: undefined });
    });
  });

  describe('discovery action', () => {
    it('GETs the configured serverUrl with a TAXII Accept header', async () => {
      mockClient.get.mockResolvedValue({ data: { title: 'TAXII Server', api_roots: [] } });

      const result = await TaxiiConnector.actions.discovery.handler(ctx, {});

      expect(mockClient.get).toHaveBeenCalledWith(
        'https://taxii.example.com/api/v1/taxii2/',
        expect.objectContaining({
          headers: { Accept: 'application/taxii+json;version=2.1, application/json' },
        })
      );
      expect(result).toEqual({ title: 'TAXII Server', api_roots: [] });
    });

    it('throws when serverUrl is missing from config', async () => {
      const noConfigCtx = {
        ...ctx,
        config: {},
      } as ActionContext;

      await expect(TaxiiConnector.actions.discovery.handler(noConfigCtx, {})).rejects.toThrow(
        /missing required `serverUrl`/
      );
    });
  });

  describe('test handler', () => {
    it('returns ok: true when the server responds', async () => {
      mockClient.get.mockResolvedValue({ data: {} });
      if (!TaxiiConnector.test) throw new Error('Test handler not defined');

      const result = await TaxiiConnector.test.handler(ctx);

      expect(result.ok).toBe(true);
    });

    it('returns ok: false with the error message on failure', async () => {
      mockClient.get.mockRejectedValue(new Error('connect ECONNREFUSED'));
      if (!TaxiiConnector.test) throw new Error('Test handler not defined');

      const result = await TaxiiConnector.test.handler(ctx);

      expect(result.ok).toBe(false);
      expect(result.message).toBe('connect ECONNREFUSED');
    });
  });
});
