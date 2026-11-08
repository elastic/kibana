/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { AxiosError, AxiosHeaders } from 'axios';
import type { ActionContext } from '../../connector_spec';
import { AwsConnector } from './aws';
import { RequestInputSchema } from './types';

describe('AwsConnector', () => {
  const mockClient = {
    get: jest.fn(),
    request: jest.fn(),
  };
  const mockContext = { client: mockClient, log: {} } as unknown as ActionContext;
  const { request } = AwsConnector.actions;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('request action', () => {
    it('sends a Query-protocol request to a global endpoint and returns the raw response', async () => {
      mockClient.request.mockResolvedValue({
        status: 200,
        headers: { 'content-type': 'text/xml' },
        data: '<UpdateAccessKeyResponse/>',
      });
      const headers = { 'Content-Type': 'application/x-www-form-urlencoded; charset=utf-8' };
      const body =
        'Action=UpdateAccessKey&Version=2010-05-08&AccessKeyId=AKIAEXAMPLE&Status=Inactive';

      const result = await request.handler(
        mockContext,
        RequestInputSchema.parse({ service: 'iam', method: 'POST', headers, body })
      );

      expect(mockClient.request).toHaveBeenCalledWith({
        method: 'POST',
        url: 'https://iam.amazonaws.com/',
        params: undefined,
        headers,
        data: body,
      });
      expect(result).toEqual({
        status: 200,
        headers: { 'content-type': 'text/xml' },
        data: '<UpdateAccessKeyResponse/>',
      });
    });

    it('sends a regional request with query params and a JSON body', async () => {
      mockClient.request.mockResolvedValue({ status: 200, headers: {}, data: { ok: true } });

      await request.handler(
        mockContext,
        RequestInputSchema.parse({
          service: 'lambda',
          region: 'eu-west-1',
          method: 'POST',
          path: '/2015-03-31/functions/my-fn/invocations',
          query: { Qualifier: 'prod' },
          body: { key: 'value' },
        })
      );

      expect(mockClient.request).toHaveBeenCalledWith({
        method: 'POST',
        url: 'https://lambda.eu-west-1.amazonaws.com/2015-03-31/functions/my-fn/invocations',
        params: { Qualifier: 'prod' },
        headers: undefined,
        data: '{"key":"value"}',
      });
    });

    it('includes the status and AWS error body in the thrown error', async () => {
      const errorBody = '<ErrorResponse><Error><Code>AccessDenied</Code></Error></ErrorResponse>';
      mockClient.request.mockRejectedValue(
        new AxiosError('Request failed', 'ERR_BAD_REQUEST', undefined, undefined, {
          status: 403,
          statusText: 'Forbidden',
          headers: {},
          config: { headers: new AxiosHeaders() },
          data: errorBody,
        })
      );

      await expect(
        request.handler(mockContext, RequestInputSchema.parse({ service: 'iam' }))
      ).rejects.toThrow(`AWS iam request failed with status 403: ${errorBody}`);
    });
  });

  describe('input schema', () => {
    it.each([
      ['iam', undefined],
      ['ec2', 'us-east-1'],
      ['securityhub', 'ap-southeast-2'],
      ['sts', 'us-gov-west-1'],
    ])('accepts service %s in region %s', (service, region) => {
      expect(RequestInputSchema.safeParse({ service, region }).success).toBe(true);
    });

    it.each([
      [{ service: 'evil.com/' }],
      [{ service: 'iam.evil' }],
      [{ service: 'IAM' }],
      [{ service: '' }],
      [{ service: 'ec2', region: 'us-east-1.evil.com' }],
      [{ service: 'ec2', region: 'useast1' }],
      [{ service: 'ec2', path: 'no-leading-slash' }],
    ])('rejects %o', (input) => {
      expect(RequestInputSchema.safeParse(input).success).toBe(false);
    });
  });

  describe('test handler', () => {
    it('calls STS GetCallerIdentity', async () => {
      mockClient.get.mockResolvedValue({ status: 200, data: '' });

      await AwsConnector.test.handler(mockContext);

      expect(mockClient.get).toHaveBeenCalledWith('https://sts.amazonaws.com/', {
        params: { Action: 'GetCallerIdentity', Version: '2011-06-15' },
      });
    });
  });
});
