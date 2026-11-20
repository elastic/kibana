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

    it('passes the signing name to the SigV4 interceptor', async () => {
      mockClient.request.mockResolvedValue({ status: 200, headers: {}, data: {} });

      await request.handler(
        mockContext,
        RequestInputSchema.parse({
          service: 'bedrock-runtime',
          signingName: 'bedrock',
          region: 'us-east-1',
          method: 'POST',
          path: '/model/my-model/invoke',
          body: {},
        })
      );

      expect(mockClient.request).toHaveBeenCalledWith(
        expect.objectContaining({
          url: 'https://bedrock-runtime.us-east-1.amazonaws.com/model/my-model/invoke',
          awsSigningName: 'bedrock',
        })
      );
    });

    it('rethrows the AWS error with its status and body in the message, keeping the response', async () => {
      const errorBody = '<ErrorResponse><Error><Code>AccessDenied</Code></Error></ErrorResponse>';
      const error = new AxiosError('Request failed', 'ERR_BAD_REQUEST', undefined, undefined, {
        status: 403,
        statusText: 'Forbidden',
        headers: { 'x-amzn-requestid': 'req-1' },
        config: { headers: new AxiosHeaders() },
        data: errorBody,
      });
      mockClient.request.mockRejectedValue(error);

      const thrown = await request
        .handler(mockContext, RequestInputSchema.parse({ service: 'iam' }))
        .catch((e: unknown) => e);

      expect(thrown).toBe(error);
      expect(error.message).toBe(`AWS iam request failed with status 403: ${errorBody}`);
      expect(error.response?.headers).toEqual({ 'x-amzn-requestid': 'req-1' });
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

    it('accepts HEAD requests', () => {
      expect(RequestInputSchema.safeParse({ service: 's3', method: 'HEAD' }).success).toBe(true);
    });

    it.each([
      [{ service: 'evil.com/' }],
      [{ service: 'iam.evil' }],
      [{ service: 'IAM' }],
      [{ service: '' }],
      [{ service: 'ec2', region: 'us-east-1.evil.com' }],
      [{ service: 'ec2', region: 'useast1' }],
      [{ service: 'ec2', region: 'cn-north-1' }],
      [{ service: 'ec2', path: 'no-leading-slash' }],
      [{ service: 'bedrock-runtime', signingName: 'bedrock.evil' }],
    ])('rejects %o', (input) => {
      expect(RequestInputSchema.safeParse(input).success).toBe(false);
    });
  });

  describe('test handler', () => {
    const params = { Action: 'GetCallerIdentity', Version: '2011-06-15' };
    const stsError = (code: string) =>
      new AxiosError('Request failed', 'ERR_BAD_REQUEST', undefined, undefined, {
        status: 403,
        statusText: 'Forbidden',
        headers: {},
        config: { headers: new AxiosHeaders() },
        data: { Error: { Code: code } },
      });

    it('calls STS GetCallerIdentity', async () => {
      mockClient.get.mockResolvedValue({ status: 200, data: '' });

      await AwsConnector.test.handler(mockContext);

      expect(mockClient.get).toHaveBeenCalledTimes(1);
      expect(mockClient.get).toHaveBeenCalledWith('https://sts.amazonaws.com/', { params });
    });

    it('retries on the GovCloud STS endpoint when the commercial partition does not know the key', async () => {
      mockClient.get
        .mockRejectedValueOnce(stsError('InvalidClientTokenId'))
        .mockResolvedValueOnce({ status: 200, data: '' });

      await expect(AwsConnector.test.handler(mockContext)).resolves.toEqual({});

      expect(mockClient.get).toHaveBeenLastCalledWith('https://sts.us-gov-west-1.amazonaws.com/', {
        params,
      });
    });

    it('does not retry on other errors', async () => {
      mockClient.get.mockRejectedValueOnce(stsError('SignatureDoesNotMatch'));

      await expect(AwsConnector.test.handler(mockContext)).rejects.toThrow('Request failed');

      expect(mockClient.get).toHaveBeenCalledTimes(1);
    });
  });
});
