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
import { callSsmApi } from './aws_ssm_api';

describe('callSsmApi', () => {
  const mockClient = { post: jest.fn() };
  const ctx = {
    client: mockClient,
    config: { region: 'us-east-1' },
    log: {},
  } as unknown as ActionContext;

  beforeEach(() => {
    jest.clearAllMocks();
    mockClient.post.mockResolvedValue({ data: {} });
  });

  it('posts the JSON body to the regional endpoint with the operation as X-Amz-Target', async () => {
    await callSsmApi({ ctx, operation: 'DescribeInstanceInformation', body: { MaxResults: 10 } });

    expect(mockClient.post).toHaveBeenCalledWith(
      'https://ssm.us-east-1.amazonaws.com/',
      JSON.stringify({ MaxResults: 10 }),
      {
        headers: {
          'Content-Type': 'application/x-amz-json-1.1',
          'X-Amz-Target': 'AmazonSSM.DescribeInstanceInformation',
        },
      }
    );
  });

  const message = 'User is not authorized to perform ssm:DescribeInstanceInformation';

  it.each([
    ['body', {}, { __type: 'com.amazonaws.ssm#AccessDeniedException', message }],
    [
      'x-amzn-ErrorType header',
      { 'x-amzn-errortype': 'AccessDeniedException:http://internal.amazon.com/coral/' },
      { message },
    ],
  ])(
    'surfaces the AWS error code from the %s and the message, keeping the HTTP response',
    async (_source, headers, data) => {
      mockClient.post.mockRejectedValue(
        new AxiosError('Request failed with status code 400', 'ERR_BAD_REQUEST', undefined, {}, {
          status: 400,
          headers,
          data,
        } as AxiosResponse)
      );

      await expect(
        callSsmApi({ ctx, operation: 'DescribeInstanceInformation' })
      ).rejects.toMatchObject({
        message: `AmazonSSM.DescribeInstanceInformation failed (AccessDeniedException): ${message}`,
        response: { status: 400, headers },
      });
    }
  );
});
