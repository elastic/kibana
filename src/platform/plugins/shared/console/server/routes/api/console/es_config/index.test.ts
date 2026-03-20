/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { kibanaResponseFactory } from '@kbn/core/server';
import { httpServiceMock, coreMock } from '@kbn/core/server/mocks';
import { duration } from 'moment';
import { EsLegacyConfigService, SpecDefinitionsService } from '../../../../services';
import { registerEsConfigRoute } from '.';
import type { RouteDependencies } from '../../..';
import { handleEsError } from '../../../../shared_imports';

describe('ES Config Route', () => {
  let routeDeps: RouteDependencies;
  let mockEsLegacyConfigService: EsLegacyConfigService;

  const mockReadLegacyESConfig = jest.fn();
  const mockRouter = httpServiceMock.createRouter();

  beforeEach(() => {
    jest.clearAllMocks();

    mockEsLegacyConfigService = new EsLegacyConfigService();
    mockEsLegacyConfigService.getCloudUrl = jest.fn();

    mockReadLegacyESConfig.mockResolvedValue({
      requestTimeout: duration(30000),
      customHeaders: {},
      requestHeadersWhitelist: [],
      hosts: ['http://localhost:9200', 'http://localhost:9201'],
    });

    routeDeps = {
      router: mockRouter,
      log: coreMock.createPluginInitializerContext().logger.get(),
      proxy: {
        readLegacyESConfig: mockReadLegacyESConfig,
      },
      services: {
        esLegacyConfigService: mockEsLegacyConfigService,
        specDefinitionService: new SpecDefinitionsService(),
      },
      lib: { handleEsError },
    };

    registerEsConfigRoute(routeDeps);
  });

  describe('when cloud URL is available', () => {
    beforeEach(() => {
      (mockEsLegacyConfigService.getCloudUrl as jest.Mock).mockReturnValue(
        'https://cloud.elastic.co:443'
      );
    });

    it('should use cloud URL as host but proxy hosts for allHosts', async () => {
      const [[, handler]] = mockRouter.get.mock.calls;
      const mockRequest = {} as any;
      const mockResponse = kibanaResponseFactory;
      const mockContext = {};

      const response = await handler(mockContext, mockRequest, mockResponse);

      expect(mockReadLegacyESConfig).toHaveBeenCalled();
      expect(response.status).toBe(200);
      expect(response.payload).toEqual({
        host: 'https://cloud.elastic.co/',
        allHosts: ['http://localhost:9200/', 'http://localhost:9201/'],
      });
    });
  });

  describe('when cloud URL is not available', () => {
    beforeEach(() => {
      (mockEsLegacyConfigService.getCloudUrl as jest.Mock).mockReturnValue(undefined);
    });

    it('should use first proxy host as host and all proxy hosts for allHosts', async () => {
      const [[, handler]] = mockRouter.get.mock.calls;
      const mockRequest = {} as any;
      const mockResponse = kibanaResponseFactory;
      const mockContext = {};

      const response = await handler(mockContext, mockRequest, mockResponse);

      expect(mockReadLegacyESConfig).toHaveBeenCalled();
      expect(response.status).toBe(200);
      expect(response.payload).toEqual({
        host: 'http://localhost:9200/',
        allHosts: ['http://localhost:9200/', 'http://localhost:9201/'],
      });
    });
  });

  describe('when hosts contain credentials', () => {
    beforeEach(() => {
      mockReadLegacyESConfig.mockResolvedValue({
        requestTimeout: duration(30000),
        customHeaders: {},
        requestHeadersWhitelist: [],
        hosts: ['https://kibana_system:SECRET@elasticsearch:9200'],
      });
      (mockEsLegacyConfigService.getCloudUrl as jest.Mock).mockReturnValue(undefined);
    });

    it('should strip credentials from host URLs', async () => {
      const [[, handler]] = mockRouter.get.mock.calls;
      const mockRequest = {} as any;
      const mockResponse = kibanaResponseFactory;
      const mockContext = {};

      const response = await handler(mockContext, mockRequest, mockResponse);

      expect(response.payload).toEqual({
        host: 'https://elasticsearch:9200/',
        allHosts: ['https://elasticsearch:9200/'],
      });
    });
  });

  describe('with multiple proxy hosts', () => {
    beforeEach(() => {
      mockReadLegacyESConfig.mockResolvedValue({
        requestTimeout: duration(30000),
        customHeaders: {},
        requestHeadersWhitelist: [],
        hosts: ['http://es-node-1:9200', 'http://es-node-2:9200', 'http://es-node-3:9200'],
      });
    });

    it('should return all proxy hosts in allHosts regardless of cloud URL', async () => {
      (mockEsLegacyConfigService.getCloudUrl as jest.Mock).mockReturnValue(
        'https://cloud.elastic.co:443'
      );

      const [[, handler]] = mockRouter.get.mock.calls;
      const mockRequest = {} as any;
      const mockResponse = kibanaResponseFactory;
      const mockContext = {};

      const response = await handler(mockContext, mockRequest, mockResponse);

      expect(response.payload).toEqual({
        host: 'https://cloud.elastic.co/',
        allHosts: ['http://es-node-1:9200/', 'http://es-node-2:9200/', 'http://es-node-3:9200/'],
      });
    });
  });
});
