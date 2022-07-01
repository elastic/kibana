/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { errors } from '@elastic/elasticsearch';

import type { ObjectType } from '@kbn/config-schema';
import type { IRouter, RequestHandler, RequestHandlerContext, RouteConfig } from '@kbn/core/server';
import { kibanaResponseFactory } from '@kbn/core/server';
import { httpServerMock } from '@kbn/core/server/mocks';

import {
  ElasticsearchConnectionStatus,
  ERROR_CONFIGURE_FAILURE,
  ERROR_ELASTICSEARCH_CONNECTION_CONFIGURED,
  ERROR_KIBANA_CONFIG_FAILURE,
  ERROR_KIBANA_CONFIG_NOT_WRITABLE,
  ERROR_OUTSIDE_PREBOOT_STAGE,
} from '../../common';
import { interactiveSetupMock } from '../mocks';
import { defineConfigureRoute } from './configure';
import { routeDefinitionParamsMock } from './index.mock';

describe('Configure routes', () => {
  let router: jest.Mocked<IRouter>;
  let mockRouteParams: ReturnType<typeof routeDefinitionParamsMock.create>;
  let mockContext: RequestHandlerContext;
  beforeEach(() => {
    mockRouteParams = routeDefinitionParamsMock.create();
    router = mockRouteParams.router;

    mockContext = {} as unknown as RequestHandlerContext;

    defineConfigureRoute(mockRouteParams);
  });

  describe('#configure', () => {
    let routeHandler: RequestHandler<any, any, any>;
    let routeConfig: RouteConfig<any, any, any, any>;

    beforeEach(() => {
      const [configureRouteConfig, configureRouteHandler] = router.post.mock.calls.find(
        ([{ path }]) => path === '/internal/interactive_setup/configure'
      )!;

      routeConfig = configureRouteConfig;
      routeHandler = configureRouteHandler;
    });

    it('correctly defines route.', () => {
      expect(routeConfig.options).toEqual({ authRequired: false });

      const bodySchema = (routeConfig.validate as any).body as ObjectType;
      expect(() => bodySchema.validate({})).toThrowErrorMatchingInlineSnapshot(
        `"[host]: expected value of type [string] but got [undefined]."`
      );
      expect(() => bodySchema.validate({ host: '' })).toThrowErrorMatchingInlineSnapshot(
        `"[host]: \\"host\\" is not allowed to be empty"`
      );
      expect(() =>
        bodySchema.validate({ host: 'localhost:9200' })
      ).toThrowErrorMatchingInlineSnapshot(`"[host]: expected URI with scheme [http|https]."`);
      expect(bodySchema.validate({ host: 'http://localhost:9200' })).toMatchInlineSnapshot(`
        Object {
          "host": "http://localhost:9200",
        }
      `);
      expect(() =>
        bodySchema.validate({ host: 'http://localhost:9200', username: 'elastic' })
      ).toThrowErrorMatchingInlineSnapshot(
        `"[username]: value of \\"elastic\\" is forbidden. This is a superuser account that can obfuscate privilege-related issues. You should use the \\"kibana_system\\" user instead."`
      );
      expect(() =>
        bodySchema.validate({ host: 'http://localhost:9200', username: 'kibana_system' })
      ).toThrowErrorMatchingInlineSnapshot(
        `"[password]: expected value of type [string] but got [undefined]"`
      );
      expect(() =>
        bodySchema.validate({ host: 'http://localhost:9200', password: 'password' })
      ).toThrowErrorMatchingInlineSnapshot(`"[password]: a value wasn't expected to be present"`);
      expect(
        bodySchema.validate({
          host: 'http://localhost:9200',
          username: 'kibana_system',
          password: '',
        })
      ).toMatchInlineSnapshot(`
        Object {
          "host": "http://localhost:9200",
          "password": "",
          "username": "kibana_system",
        }
      `);
      expect(() =>
        bodySchema.validate({ host: 'https://localhost:9200' })
      ).toThrowErrorMatchingInlineSnapshot(
        `"[caCert]: expected value of type [string] but got [undefined]"`
      );
      expect(bodySchema.validate({ host: 'https://localhost:9200', caCert: 'der' }))
        .toMatchInlineSnapshot(`
        Object {
          "caCert": "der",
          "host": "https://localhost:9200",
        }
      `);
      expect(bodySchema.validate({ host: 'https://localhost:9200', caCert: 'der', code: '123456' }))
        .toMatchInlineSnapshot(`
        Object {
          "caCert": "der",
          "code": "123456",
          "host": "https://localhost:9200",
        }
      `);
    });

    it('fails if verification code is invalid.', async () => {
      mockRouteParams.verificationCode.verify.mockReturnValue(false);

      const mockRequest = httpServerMock.createKibanaRequest({
        body: { host: 'host1' },
      });

      await expect(routeHandler(mockContext, mockRequest, kibanaResponseFactory)).resolves.toEqual(
        expect.objectContaining({
          status: 403,
        })
      );

      expect(mockRouteParams.elasticsearch.authenticate).not.toHaveBeenCalled();
      expect(mockRouteParams.kibanaConfigWriter.writeConfig).not.toHaveBeenCalled();
      expect(mockRouteParams.preboot.completeSetup).not.toHaveBeenCalled();
    });

    it('fails if setup is not on hold.', async () => {
      mockRouteParams.preboot.isSetupOnHold.mockReturnValue(false);

      const mockRequest = httpServerMock.createKibanaRequest({
        body: { host: 'host1' },
      });

      await expect(routeHandler(mockContext, mockRequest, kibanaResponseFactory)).resolves.toEqual(
        expect.objectContaining({
          status: 400,
          payload: {
            attributes: {
              type: ERROR_OUTSIDE_PREBOOT_STAGE,
            },
            message: 'Cannot process request outside of preboot stage.',
          },
        })
      );

      expect(mockRouteParams.elasticsearch.authenticate).not.toHaveBeenCalled();
      expect(mockRouteParams.kibanaConfigWriter.writeConfig).not.toHaveBeenCalled();
      expect(mockRouteParams.preboot.completeSetup).not.toHaveBeenCalled();
    });

    it('fails if Elasticsearch connection is already configured.', async () => {
      mockRouteParams.preboot.isSetupOnHold.mockReturnValue(true);
      mockRouteParams.elasticsearch.connectionStatus$.next(
        ElasticsearchConnectionStatus.Configured
      );

      const mockRequest = httpServerMock.createKibanaRequest({
        body: { host: 'host1' },
      });

      await expect(routeHandler(mockContext, mockRequest, kibanaResponseFactory)).resolves.toEqual(
        expect.objectContaining({
          status: 400,
          payload: {
            message: 'Elasticsearch connection is already configured.',
            attributes: { type: ERROR_ELASTICSEARCH_CONNECTION_CONFIGURED },
          },
        })
      );

      expect(mockRouteParams.elasticsearch.authenticate).not.toHaveBeenCalled();
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
        body: { host: 'host1' },
      });

      await expect(routeHandler(mockContext, mockRequest, kibanaResponseFactory)).resolves.toEqual(
        expect.objectContaining({
          status: 500,
          payload: {
            message: 'Kibana process does not have enough permissions to write to config file.',
            attributes: { type: ERROR_KIBANA_CONFIG_NOT_WRITABLE },
          },
        })
      );

      expect(mockRouteParams.elasticsearch.authenticate).not.toHaveBeenCalled();
      expect(mockRouteParams.kibanaConfigWriter.writeConfig).not.toHaveBeenCalled();
      expect(mockRouteParams.preboot.completeSetup).not.toHaveBeenCalled();
    });

    it('fails if authenticate call fails.', async () => {
      mockRouteParams.preboot.isSetupOnHold.mockReturnValue(true);
      mockRouteParams.elasticsearch.connectionStatus$.next(
        ElasticsearchConnectionStatus.NotConfigured
      );
      mockRouteParams.kibanaConfigWriter.isConfigWritable.mockResolvedValue(true);
      mockRouteParams.elasticsearch.authenticate.mockRejectedValue(
        new errors.ResponseError(
          interactiveSetupMock.createApiResponse({
            statusCode: 401,
            body: { message: 'some-secret-message' },
          })
        )
      );

      const mockRequest = httpServerMock.createKibanaRequest({
        body: { host: 'host1' },
      });

      await expect(routeHandler(mockContext, mockRequest, kibanaResponseFactory)).resolves.toEqual(
        expect.objectContaining({
          status: 500,
          payload: {
            message: 'Failed to configure.',
            attributes: { type: ERROR_CONFIGURE_FAILURE },
          },
        })
      );

      expect(mockRouteParams.elasticsearch.authenticate).toHaveBeenCalledTimes(1);
      expect(mockRouteParams.kibanaConfigWriter.writeConfig).not.toHaveBeenCalled();
      expect(mockRouteParams.preboot.completeSetup).not.toHaveBeenCalled();
    });

    it('fails if cannot write configuration to the disk.', async () => {
      mockRouteParams.preboot.isSetupOnHold.mockReturnValue(true);
      mockRouteParams.elasticsearch.connectionStatus$.next(
        ElasticsearchConnectionStatus.NotConfigured
      );
      mockRouteParams.kibanaConfigWriter.isConfigWritable.mockResolvedValue(true);
      mockRouteParams.kibanaConfigWriter.writeConfig.mockRejectedValue(
        new Error('Some error with sensitive path')
      );

      const mockRequest = httpServerMock.createKibanaRequest({
        body: { host: 'host1' },
      });

      await expect(routeHandler(mockContext, mockRequest, kibanaResponseFactory)).resolves.toEqual(
        expect.objectContaining({
          status: 500,
          payload: {
            message: 'Failed to save configuration.',
            attributes: { type: ERROR_KIBANA_CONFIG_FAILURE },
          },
        })
      );

      expect(mockRouteParams.elasticsearch.authenticate).toHaveBeenCalledTimes(1);
      expect(mockRouteParams.kibanaConfigWriter.writeConfig).toHaveBeenCalledTimes(1);
      expect(mockRouteParams.preboot.completeSetup).not.toHaveBeenCalled();
    });

    it('can successfully authenticate and save configuration to the disk.', async () => {
      mockRouteParams.preboot.isSetupOnHold.mockReturnValue(true);
      mockRouteParams.elasticsearch.connectionStatus$.next(
        ElasticsearchConnectionStatus.NotConfigured
      );
      mockRouteParams.kibanaConfigWriter.isConfigWritable.mockResolvedValue(true);
      mockRouteParams.kibanaConfigWriter.writeConfig.mockResolvedValue();

      const mockRequest = httpServerMock.createKibanaRequest({
        body: { host: 'host', username: 'username', password: 'password', caCert: 'der' },
      });

      await expect(routeHandler(mockContext, mockRequest, kibanaResponseFactory)).resolves.toEqual(
        expect.objectContaining({
          status: 204,
          payload: undefined,
        })
      );

      expect(mockRouteParams.elasticsearch.authenticate).toHaveBeenCalledTimes(1);
      expect(mockRouteParams.elasticsearch.authenticate).toHaveBeenCalledWith({
        host: 'host',
        username: 'username',
        password: 'password',
        caCert: '-----BEGIN CERTIFICATE-----\nder\n-----END CERTIFICATE-----\n',
      });

      expect(mockRouteParams.kibanaConfigWriter.writeConfig).toHaveBeenCalledTimes(1);
      expect(mockRouteParams.kibanaConfigWriter.writeConfig).toHaveBeenCalledWith({
        host: 'host',
        username: 'username',
        password: 'password',
        caCert: '-----BEGIN CERTIFICATE-----\nder\n-----END CERTIFICATE-----\n',
      });

      expect(mockRouteParams.preboot.completeSetup).toHaveBeenCalledTimes(1);
      expect(mockRouteParams.preboot.completeSetup).toHaveBeenCalledWith({
        shouldReloadConfig: true,
      });
    });
  });
});
