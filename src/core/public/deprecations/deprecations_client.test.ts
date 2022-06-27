/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { httpServiceMock } from '../http/http_service.mock';
import { DeprecationsClient } from './deprecations_client';
import type { DomainDeprecationDetails } from '../../server/types';

describe('DeprecationsClient', () => {
  const http = httpServiceMock.createSetupContract();
  const mockDeprecations = [
    { domainId: 'testPluginId-1' },
    { domainId: 'testPluginId-1' },
    { domainId: 'testPluginId-2' },
  ];

  beforeEach(() => {
    http.fetch.mockReset();
    http.fetch.mockResolvedValue({ deprecations: mockDeprecations });
  });

  describe('getAllDeprecations', () => {
    it('returns a list of deprecations', async () => {
      const deprecationsClient = new DeprecationsClient({ http });
      const deprecations = await deprecationsClient.getAllDeprecations();
      expect(http.fetch).toBeCalledTimes(1);
      expect(http.fetch).toBeCalledWith('/api/deprecations/', {
        asSystemRequest: true,
      });

      expect(deprecations).toEqual(mockDeprecations);
    });
  });

  describe('getDeprecations', () => {
    it('returns deprecations for a single domainId', async () => {
      const deprecationsClient = new DeprecationsClient({ http });
      const deprecations = await deprecationsClient.getDeprecations('testPluginId-1');

      expect(deprecations.length).toBe(2);
      expect(deprecations).toEqual([
        { domainId: 'testPluginId-1' },
        { domainId: 'testPluginId-1' },
      ]);
    });

    it('returns [] if the domainId does not have any deprecations', async () => {
      const deprecationsClient = new DeprecationsClient({ http });
      const deprecations = await deprecationsClient.getDeprecations('testPluginId-4');

      expect(deprecations).toEqual([]);
    });

    it('calls the fetch api', async () => {
      const deprecationsClient = new DeprecationsClient({ http });
      http.fetch.mockResolvedValueOnce({
        deprecations: [{ domainId: 'testPluginId-1' }, { domainId: 'testPluginId-1' }],
      });
      http.fetch.mockResolvedValueOnce({
        deprecations: [{ domainId: 'testPluginId-2' }, { domainId: 'testPluginId-2' }],
      });
      const results = [
        ...(await deprecationsClient.getDeprecations('testPluginId-1')),
        ...(await deprecationsClient.getDeprecations('testPluginId-2')),
      ];

      expect(http.fetch).toBeCalledTimes(2);
      expect(results).toEqual([
        { domainId: 'testPluginId-1' },
        { domainId: 'testPluginId-1' },
        { domainId: 'testPluginId-2' },
        { domainId: 'testPluginId-2' },
      ]);
    });
  });

  describe('isDeprecationResolvable', () => {
    it('returns true if deprecation has correctiveActions.api', async () => {
      const deprecationsClient = new DeprecationsClient({ http });
      const mockDeprecationDetails: DomainDeprecationDetails = {
        title: 'some-title',
        domainId: 'testPluginId-1',
        message: 'some-message',
        level: 'warning',
        correctiveActions: {
          api: {
            path: 'some-path',
            method: 'POST',
          },
          manualSteps: ['manual-step'],
        },
      };

      const isResolvable = deprecationsClient.isDeprecationResolvable(mockDeprecationDetails);

      expect(isResolvable).toBe(true);
    });

    it('returns false if deprecation is missing correctiveActions.api', async () => {
      const deprecationsClient = new DeprecationsClient({ http });
      const mockDeprecationDetails: DomainDeprecationDetails = {
        title: 'some-title',
        domainId: 'testPluginId-1',
        message: 'some-message',
        level: 'warning',
        correctiveActions: {
          manualSteps: ['manual-step'],
        },
      };

      const isResolvable = deprecationsClient.isDeprecationResolvable(mockDeprecationDetails);

      expect(isResolvable).toBe(false);
    });
  });

  describe('resolveDeprecation', () => {
    it('fails if deprecation is not resolvable', async () => {
      const deprecationsClient = new DeprecationsClient({ http });
      const mockDeprecationDetails: DomainDeprecationDetails = {
        title: 'some-title',
        domainId: 'testPluginId-1',
        message: 'some-message',
        level: 'warning',
        correctiveActions: {
          manualSteps: ['manual-step'],
        },
      };
      const result = await deprecationsClient.resolveDeprecation(mockDeprecationDetails);

      expect(result).toMatchInlineSnapshot(`
        Object {
          "reason": "This deprecation cannot be resolved automatically.",
          "status": "fail",
        }
      `);
    });

    it('fetches the deprecation api', async () => {
      const deprecationsClient = new DeprecationsClient({ http });
      const mockDeprecationDetails: DomainDeprecationDetails = {
        title: 'some-title',
        domainId: 'testPluginId-1',
        message: 'some-message',
        level: 'warning',
        correctiveActions: {
          api: {
            path: 'some-path',
            method: 'POST',
            body: {
              extra_param: 123,
            },
          },
          manualSteps: ['manual-step'],
        },
      };
      const result = await deprecationsClient.resolveDeprecation(mockDeprecationDetails);

      expect(http.fetch).toBeCalledTimes(1);
      expect(http.fetch).toBeCalledWith({
        path: 'some-path',
        method: 'POST',
        asSystemRequest: true,
        body: JSON.stringify({
          extra_param: 123,
          deprecationDetails: { domainId: 'testPluginId-1' },
        }),
      });
      expect(result).toEqual({ status: 'ok' });
    });

    it('fails when fetch fails', async () => {
      const deprecationsClient = new DeprecationsClient({ http });
      const mockResponse = 'Failed to fetch';
      const mockDeprecationDetails: DomainDeprecationDetails = {
        title: 'some-title',
        domainId: 'testPluginId-1',
        message: 'some-message',
        level: 'warning',
        correctiveActions: {
          api: {
            path: 'some-path',
            method: 'POST',
            body: {
              extra_param: 123,
            },
          },
          manualSteps: ['manual-step'],
        },
      };
      http.fetch.mockRejectedValue({ body: { message: mockResponse } });
      const result = await deprecationsClient.resolveDeprecation(mockDeprecationDetails);

      expect(result).toEqual({ status: 'fail', reason: mockResponse });
    });

    it('omit deprecationDetails in the request of the body', async () => {
      const deprecationsClient = new DeprecationsClient({ http });
      const mockDeprecationDetails: DomainDeprecationDetails = {
        title: 'some-title',
        domainId: 'testPluginId-1',
        message: 'some-message',
        level: 'warning',
        correctiveActions: {
          api: {
            path: 'some-path',
            method: 'POST',
            body: {
              extra_param: 123,
            },
            omitContextFromBody: true,
          },
          manualSteps: ['manual-step'],
        },
      };
      const result = await deprecationsClient.resolveDeprecation(mockDeprecationDetails);

      expect(http.fetch).toBeCalledTimes(1);
      expect(http.fetch).toBeCalledWith({
        path: 'some-path',
        method: 'POST',
        asSystemRequest: true,
        body: JSON.stringify({
          extra_param: 123,
        }),
      });
      expect(result).toEqual({ status: 'ok' });
    });
  });
});
