/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { errors } from '@elastic/elasticsearch';

import type { ObjectType } from '@kbn/config-schema';
import type { IRouter, RequestHandler, RequestHandlerContext, RouteConfig } from 'src/core/server';
import { kibanaResponseFactory } from 'src/core/server';
import { httpServerMock } from 'src/core/server/mocks';

import { ElasticsearchConnectionStatus } from '../../common';
import { interactiveSetupMock } from '../mocks';
import { defineEnrollRoutes } from './enroll';
import { routeDefinitionParamsMock } from './index.mock';

describe('Enroll routes', () => {
  let router: jest.Mocked<IRouter>;
  let mockRouteParams: ReturnType<typeof routeDefinitionParamsMock.create>;
  let mockContext: RequestHandlerContext;
  beforeEach(() => {
    mockRouteParams = routeDefinitionParamsMock.create();
    router = mockRouteParams.router;

    mockContext = ({} as unknown) as RequestHandlerContext;

    defineEnrollRoutes(mockRouteParams);
  });

  describe('#enroll', () => {
    let routeHandler: RequestHandler<any, any, any>;
    let routeConfig: RouteConfig<any, any, any, any>;

    beforeEach(() => {
      const [enrollRouteConfig, enrollRouteHandler] = router.post.mock.calls.find(
        ([{ path }]) => path === '/internal/interactive_setup/enroll'
      )!;

      routeConfig = enrollRouteConfig;
      routeHandler = enrollRouteHandler;
    });

    it('correctly defines route.', () => {
      expect(routeConfig.options).toEqual({ authRequired: false });

      const bodySchema = (routeConfig.validate as any).body as ObjectType;
      expect(() => bodySchema.validate({})).toThrowErrorMatchingInlineSnapshot(
        `"[hosts]: expected value of type [array] but got [undefined]"`
      );

      expect(() => bodySchema.validate({ hosts: [] })).toThrowErrorMatchingInlineSnapshot(
        `"[hosts]: array size is [0], but cannot be smaller than [1]"`
      );
      expect(() =>
        bodySchema.validate({ hosts: ['localhost:9200'] })
      ).toThrowErrorMatchingInlineSnapshot(`"[hosts.0]: expected URI with scheme [https]."`);
      expect(() =>
        bodySchema.validate({ hosts: ['http://localhost:9200'] })
      ).toThrowErrorMatchingInlineSnapshot(`"[hosts.0]: expected URI with scheme [https]."`);
      expect(() =>
        bodySchema.validate({
          apiKey: 'some-key',
          hosts: ['https://localhost:9200', 'http://localhost:9243'],
        })
      ).toThrowErrorMatchingInlineSnapshot(`"[hosts.1]: expected URI with scheme [https]."`);

      expect(() =>
        bodySchema.validate({ hosts: ['https://localhost:9200'] })
      ).toThrowErrorMatchingInlineSnapshot(
        `"[apiKey]: expected value of type [string] but got [undefined]"`
      );
      expect(() =>
        bodySchema.validate({ apiKey: '', hosts: ['https://localhost:9200'] })
      ).toThrowErrorMatchingInlineSnapshot(
        `"[apiKey]: value has length [0] but it must have a minimum length of [1]."`
      );

      expect(() =>
        bodySchema.validate({ apiKey: 'some-key', hosts: ['https://localhost:9200'] })
      ).toThrowErrorMatchingInlineSnapshot(
        `"[caFingerprint]: expected value of type [string] but got [undefined]"`
      );
      expect(() =>
        bodySchema.validate({
          apiKey: 'some-key',
          hosts: ['https://localhost:9200'],
          caFingerprint: '12345',
        })
      ).toThrowErrorMatchingInlineSnapshot(
        `"[caFingerprint]: value has length [5] but it must have a minimum length of [64]."`
      );

      expect(
        bodySchema.validate(
          bodySchema.validate({
            apiKey: 'some-key',
            hosts: ['https://localhost:9200'],
            caFingerprint: 'a'.repeat(64),
          })
        )
      ).toEqual({
        apiKey: 'some-key',
        hosts: ['https://localhost:9200'],
        caFingerprint: 'a'.repeat(64),
      });
    });

    it('fails if setup is not on hold.', async () => {
      mockRouteParams.preboot.isSetupOnHold.mockReturnValue(false);

      const mockRequest = httpServerMock.createKibanaRequest({
        body: { apiKey: 'some-key', hosts: ['host1', 'host2'], caFingerprint: 'deadbeef' },
      });

      await expect(routeHandler(mockContext, mockRequest, kibanaResponseFactory)).resolves.toEqual({
        status: 400,
        options: { body: 'Cannot process request outside of preboot stage.' },
        payload: 'Cannot process request outside of preboot stage.',
      });

      expect(mockRouteParams.elasticsearch.enroll).not.toHaveBeenCalled();
      expect(mockRouteParams.kibanaConfigWriter.writeConfig).not.toHaveBeenCalled();
      expect(mockRouteParams.preboot.completeSetup).not.toHaveBeenCalled();
    });

    it('fails if Elasticsearch connection is already configured.', async () => {
      mockRouteParams.preboot.isSetupOnHold.mockReturnValue(true);
      mockRouteParams.elasticsearch.connectionStatus$.next(
        ElasticsearchConnectionStatus.Configured
      );

      const mockRequest = httpServerMock.createKibanaRequest({
        body: { apiKey: 'some-key', hosts: ['host1', 'host2'], caFingerprint: 'deadbeef' },
      });

      await expect(routeHandler(mockContext, mockRequest, kibanaResponseFactory)).resolves.toEqual({
        status: 400,
        options: {
          body: {
            message: 'Elasticsearch connection is already configured.',
            attributes: { type: 'elasticsearch_connection_configured' },
          },
        },
        payload: {
          message: 'Elasticsearch connection is already configured.',
          attributes: { type: 'elasticsearch_connection_configured' },
        },
      });

      expect(mockRouteParams.elasticsearch.enroll).not.toHaveBeenCalled();
      expect(mockRouteParams.kibanaConfigWriter.writeConfig).not.toHaveBeenCalled();
      expect(mockRouteParams.preboot.completeSetup).not.toHaveBeenCalled();
    });

    it('fails if Kibana config is not writable.', async () => {
      mockRouteParams.preboot.isSetupOnHold.mockReturnValue(true);
      mockRouteParams.elasticsearch.connectionStatus$.next(
        ElasticsearchConnectionStatus.NotConfigured
      );
      mockRouteParams.kibanaConfigWriter.isConfigWritable.mockResolvedValue(false);

      const mockRequest = httpServerMock.createKibanaRequest({
        body: { apiKey: 'some-key', hosts: ['host1', 'host2'], caFingerprint: 'deadbeef' },
      });

      await expect(routeHandler(mockContext, mockRequest, kibanaResponseFactory)).resolves.toEqual({
        status: 500,
        options: {
          body: {
            message: 'Kibana process does not have enough permissions to write to config file.',
            attributes: { type: 'kibana_config_not_writable' },
          },
          statusCode: 500,
        },
        payload: {
          message: 'Kibana process does not have enough permissions to write to config file.',
          attributes: { type: 'kibana_config_not_writable' },
        },
      });

      expect(mockRouteParams.elasticsearch.enroll).not.toHaveBeenCalled();
      expect(mockRouteParams.kibanaConfigWriter.writeConfig).not.toHaveBeenCalled();
      expect(mockRouteParams.preboot.completeSetup).not.toHaveBeenCalled();
    });

    it('fails if enroll call fails.', async () => {
      mockRouteParams.preboot.isSetupOnHold.mockReturnValue(true);
      mockRouteParams.elasticsearch.connectionStatus$.next(
        ElasticsearchConnectionStatus.NotConfigured
      );
      mockRouteParams.kibanaConfigWriter.isConfigWritable.mockResolvedValue(true);
      mockRouteParams.elasticsearch.enroll.mockRejectedValue(
        new errors.ResponseError(
          interactiveSetupMock.createApiResponse({
            statusCode: 401,
            body: { message: 'some-secret-message' },
          })
        )
      );

      const mockRequest = httpServerMock.createKibanaRequest({
        body: { apiKey: 'some-key', hosts: ['host1', 'host2'], caFingerprint: 'deadbeef' },
      });

      await expect(routeHandler(mockContext, mockRequest, kibanaResponseFactory)).resolves.toEqual({
        status: 500,
        options: {
          body: { message: 'Failed to enroll.', attributes: { type: 'enroll_failure' } },
          statusCode: 500,
        },
        payload: { message: 'Failed to enroll.', attributes: { type: 'enroll_failure' } },
      });

      expect(mockRouteParams.elasticsearch.enroll).toHaveBeenCalledTimes(1);
      expect(mockRouteParams.kibanaConfigWriter.writeConfig).not.toHaveBeenCalled();
      expect(mockRouteParams.preboot.completeSetup).not.toHaveBeenCalled();
    });

    it('fails if cannot write configuration to the disk.', async () => {
      mockRouteParams.preboot.isSetupOnHold.mockReturnValue(true);
      mockRouteParams.elasticsearch.connectionStatus$.next(
        ElasticsearchConnectionStatus.NotConfigured
      );
      mockRouteParams.kibanaConfigWriter.isConfigWritable.mockResolvedValue(true);
      mockRouteParams.elasticsearch.enroll.mockResolvedValue({
        ca: 'some-ca',
        host: 'host',
        serviceAccountToken: { name: 'some-name', value: 'some-value' },
      });
      mockRouteParams.kibanaConfigWriter.writeConfig.mockRejectedValue(
        new Error('Some error with sensitive path')
      );

      const mockRequest = httpServerMock.createKibanaRequest({
        body: { apiKey: 'some-key', hosts: ['host1', 'host2'], caFingerprint: 'deadbeef' },
      });

      await expect(routeHandler(mockContext, mockRequest, kibanaResponseFactory)).resolves.toEqual({
        status: 500,
        options: {
          body: {
            message: 'Failed to save configuration.',
            attributes: { type: 'kibana_config_failure' },
          },
          statusCode: 500,
        },
        payload: {
          message: 'Failed to save configuration.',
          attributes: { type: 'kibana_config_failure' },
        },
      });

      expect(mockRouteParams.elasticsearch.enroll).toHaveBeenCalledTimes(1);
      expect(mockRouteParams.kibanaConfigWriter.writeConfig).toHaveBeenCalledTimes(1);
      expect(mockRouteParams.preboot.completeSetup).not.toHaveBeenCalled();
    });

    it('can successfully enrol and save configuration to the disk.', async () => {
      mockRouteParams.preboot.isSetupOnHold.mockReturnValue(true);
      mockRouteParams.elasticsearch.connectionStatus$.next(
        ElasticsearchConnectionStatus.NotConfigured
      );
      mockRouteParams.kibanaConfigWriter.isConfigWritable.mockResolvedValue(true);
      mockRouteParams.elasticsearch.enroll.mockResolvedValue({
        ca: 'some-ca',
        host: 'host',
        serviceAccountToken: { name: 'some-name', value: 'some-value' },
      });
      mockRouteParams.kibanaConfigWriter.writeConfig.mockResolvedValue();

      const mockRequest = httpServerMock.createKibanaRequest({
        body: { apiKey: 'some-key', hosts: ['host1', 'host2'], caFingerprint: 'deadbeef' },
      });

      await expect(routeHandler(mockContext, mockRequest, kibanaResponseFactory)).resolves.toEqual({
        status: 204,
        options: {},
        payload: undefined,
      });

      expect(mockRouteParams.elasticsearch.enroll).toHaveBeenCalledTimes(1);
      expect(mockRouteParams.elasticsearch.enroll).toHaveBeenCalledWith({
        apiKey: 'some-key',
        hosts: ['host1', 'host2'],
        caFingerprint: 'DE:AD:BE:EF',
      });

      expect(mockRouteParams.kibanaConfigWriter.writeConfig).toHaveBeenCalledTimes(1);
      expect(mockRouteParams.kibanaConfigWriter.writeConfig).toHaveBeenCalledWith({
        ca: 'some-ca',
        host: 'host',
        serviceAccountToken: { name: 'some-name', value: 'some-value' },
      });

      expect(mockRouteParams.preboot.completeSetup).toHaveBeenCalledTimes(1);
      expect(mockRouteParams.preboot.completeSetup).toHaveBeenCalledWith({
        shouldReloadConfig: true,
      });
    });
  });
});
