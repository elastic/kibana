/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { AxiosResponse } from 'axios';
import { AxiosError } from 'axios';
import type { ActionContext } from '../../connector_spec';
import { AwsSsmConnector } from './aws_ssm';

describe('AwsSsmConnector', () => {
  const mockClient = { post: jest.fn() };
  const mockContext = {
    client: mockClient,
    config: { region: 'us-east-1' },
    log: {},
  } as unknown as ActionContext;
  const { describeInstanceInformation } = AwsSsmConnector.actions;

  beforeEach(() => {
    jest.clearAllMocks();
    mockClient.post.mockResolvedValue({ data: {} });
  });

  describe('describeInstanceInformation', () => {
    it('sends each filter under the key SSM expects', async () => {
      await describeInstanceInformation.handler(mockContext, {
        instanceIds: ['i-1234567890abcdef0'],
        pingStatus: ['Online'],
        platformType: ['Linux'],
        maxResults: 10,
      });
      await describeInstanceInformation.handler(mockContext, {
        tags: [{ key: 'Env', values: ['prod'] }],
      });

      expect(mockClient.post).toHaveBeenNthCalledWith(
        1,
        'https://ssm.us-east-1.amazonaws.com/',
        JSON.stringify({
          Filters: [
            { Key: 'InstanceIds', Values: ['i-1234567890abcdef0'] },
            { Key: 'PingStatus', Values: ['Online'] },
            { Key: 'PlatformTypes', Values: ['Linux'] },
          ],
          MaxResults: 10,
        }),
        {
          headers: {
            'Content-Type': 'application/x-amz-json-1.1',
            'X-Amz-Target': 'AmazonSSM.DescribeInstanceInformation',
          },
        }
      );
      expect(JSON.parse(mockClient.post.mock.calls[1][1])).toEqual({
        Filters: [{ Key: 'tag:Env', Values: ['prod'] }],
      });
    });

    it('returns ISO ping dates, and no nextToken on the last page', async () => {
      mockClient.post.mockResolvedValue({
        data: {
          InstanceInformationList: [
            { InstanceId: 'i-1234567890abcdef0', LastPingDateTime: 1700000000.5 },
          ],
          NextToken: '',
        },
      });

      await expect(describeInstanceInformation.handler(mockContext, {})).resolves.toEqual({
        instances: [
          expect.objectContaining({
            instanceId: 'i-1234567890abcdef0',
            lastPingDateTime: '2023-11-14T22:13:20.500Z',
          }),
        ],
        nextToken: null,
      });
    });

    it('surfaces the AWS error code and message', async () => {
      mockClient.post.mockRejectedValue(
        new AxiosError('Request failed with status code 400', 'ERR_BAD_REQUEST', undefined, {}, {
          status: 400,
          data: {
            __type: 'com.amazonaws.ssm#AccessDeniedException',
            message: 'User is not authorized to perform ssm:DescribeInstanceInformation',
          },
        } as AxiosResponse)
      );

      await expect(describeInstanceInformation.handler(mockContext, {})).rejects.toThrow(
        'AmazonSSM.DescribeInstanceInformation failed (AccessDeniedException): User is not authorized to perform ssm:DescribeInstanceInformation'
      );
    });
  });
});
