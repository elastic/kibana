/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ActionContext } from '../../connector_spec';
import { AwsLambdaConnector } from './aws_lambda';

describe('AwsLambdaConnector', () => {
  const mockClient = {
    get: jest.fn(),
    post: jest.fn(),
  };

  // Credentials are now stored as encrypted secrets (via aws_credentials auth type),
  // not in config. The SigV4 interceptor is configured on the axios instance by the
  // auth type, so action handlers receive a pre-configured client.
  const mockContext = {
    client: mockClient,
    config: {
      region: 'us-east-1',
    },
    secrets: {
      authType: 'aws_credentials',
      accessKeyId: 'AKIAIOSFODNN7EXAMPLE',
      secretAccessKey: 'wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY',
    },
    log: {},
  } as unknown as ActionContext;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('metadata', () => {
    it('should have correct id, display name, and auth type', () => {
      expect(AwsLambdaConnector.metadata.id).toBe('.aws_lambda');
      expect(AwsLambdaConnector.metadata.displayName).toBe('AWS Lambda');
      expect(AwsLambdaConnector.metadata.supportedFeatureIds).toContain('workflows');
      expect(AwsLambdaConnector.auth?.types).toEqual(['aws_credentials']);
    });
  });

  describe('schema', () => {
    it('should only require region in config (credentials are in auth/secrets)', () => {
      const schema = AwsLambdaConnector.schema;
      expect(schema).toBeDefined();
      if (schema) {
        expect(Object.keys(schema.shape)).toEqual(['region']);
      }
    });
  });

  describe('invoke action', () => {
    it('should invoke a function synchronously and return the response', async () => {
      mockClient.post.mockResolvedValue({
        status: 200,
        data: { result: 'hello world' },
        headers: {},
      });

      const result = await AwsLambdaConnector.actions.invoke.handler(mockContext, {
        functionName: 'my-function',
        payload: { key: 'value' },
      });

      expect(mockClient.post).toHaveBeenCalledWith(
        expect.stringContaining('lambda.us-east-1.amazonaws.com'),
        expect.stringContaining('"key":"value"'),
        expect.objectContaining({
          headers: expect.objectContaining({
            'X-Amz-Invocation-Type': 'RequestResponse',
            'X-Amz-Log-Type': 'Tail',
          }),
        })
      );

      expect(result).toEqual(
        expect.objectContaining({
          statusCode: 200,
          functionName: 'my-function',
          invocationType: 'RequestResponse',
          payload: { result: 'hello world' },
        })
      );
    });

    it('should invoke a function asynchronously', async () => {
      mockClient.post.mockResolvedValue({
        status: 202,
        data: null,
        headers: {},
      });

      const result = (await AwsLambdaConnector.actions.invoke.handler(mockContext, {
        functionName: 'my-async-function',
        payload: { event: 'data' },
        invocationType: 'Event',
      })) as Record<string, unknown>;

      expect(result.invocationType).toBe('Event');
      expect(result.message).toBe('Function my-async-function invoked asynchronously');
    });

    it('should pass qualifier when specified', async () => {
      mockClient.post.mockResolvedValue({
        status: 200,
        data: { version: '3' },
        headers: {},
      });

      await AwsLambdaConnector.actions.invoke.handler(mockContext, {
        functionName: 'my-function',
        qualifier: 'v3',
      });

      expect(mockClient.post).toHaveBeenCalledWith(
        expect.stringContaining('Qualifier=v3'),
        expect.any(String),
        expect.any(Object)
      );
    });

    it('should include function error from response headers', async () => {
      mockClient.post.mockResolvedValue({
        status: 200,
        data: { errorMessage: 'something went wrong', errorType: 'RuntimeError' },
        headers: { 'x-amz-function-error': 'Unhandled' },
      });

      const result = (await AwsLambdaConnector.actions.invoke.handler(mockContext, {
        functionName: 'failing-function',
      })) as Record<string, unknown>;

      expect(result.functionError).toBe('Unhandled');
      expect(result.payload).toEqual({
        errorMessage: 'something went wrong',
        errorType: 'RuntimeError',
      });
    });

    it('should decode base64 log result from response headers', async () => {
      const logOutput = 'START RequestId: abc-123\nEND RequestId: abc-123\n';
      mockClient.post.mockResolvedValue({
        status: 200,
        data: { ok: true },
        headers: { 'x-amz-log-result': btoa(logOutput) },
      });

      const result = (await AwsLambdaConnector.actions.invoke.handler(mockContext, {
        functionName: 'logged-function',
      })) as Record<string, unknown>;

      expect(result.logResult).toBe(logOutput);
    });

    it('should throw meaningful error when Lambda returns an API error', async () => {
      mockClient.post.mockRejectedValue({
        response: {
          status: 404,
          statusText: 'Not Found',
          data: {
            Type: 'User',
            Message: 'Function not found: arn:aws:lambda:us-east-1:123456789:function:missing',
          },
        },
      });

      await expect(
        AwsLambdaConnector.actions.invoke.handler(mockContext, {
          functionName: 'missing',
        })
      ).rejects.toThrow('AWS Lambda Error [User]');
    });

    it('should send empty JSON body when no payload is provided', async () => {
      mockClient.post.mockResolvedValue({
        status: 200,
        data: { ok: true },
        headers: {},
      });

      await AwsLambdaConnector.actions.invoke.handler(mockContext, {
        functionName: 'no-payload-function',
      });

      expect(mockClient.post).toHaveBeenCalledWith(expect.any(String), '{}', expect.any(Object));
    });
  });

  describe('listFunctions action', () => {
    it('should list Lambda functions', async () => {
      const mockResponse = {
        data: {
          Functions: [
            {
              FunctionName: 'function-one',
              FunctionArn: 'arn:aws:lambda:us-east-1:123456789:function:function-one',
              Runtime: 'nodejs18.x',
              Description: 'First function',
              LastModified: '2025-01-01T00:00:00.000+0000',
              MemorySize: 128,
              Timeout: 30,
              Handler: 'index.handler',
            },
            {
              FunctionName: 'function-two',
              FunctionArn: 'arn:aws:lambda:us-east-1:123456789:function:function-two',
              Runtime: 'python3.12',
              Description: 'Second function',
              LastModified: '2025-02-01T00:00:00.000+0000',
              MemorySize: 256,
              Timeout: 60,
              Handler: 'lambda_function.handler',
            },
          ],
          NextMarker: null,
        },
      };
      mockClient.get.mockResolvedValue(mockResponse);

      const result = (await AwsLambdaConnector.actions.listFunctions.handler(mockContext, {})) as {
        functions: Array<{ functionName: string; runtime: string }>;
        nextMarker: string | null;
      };

      expect(mockClient.get).toHaveBeenCalledWith(
        expect.stringContaining('lambda.us-east-1.amazonaws.com/2015-03-31/functions/'),
        expect.any(Object)
      );

      expect(result.functions).toHaveLength(2);
      expect(result.functions[0].functionName).toBe('function-one');
      expect(result.functions[0].runtime).toBe('nodejs18.x');
      expect(result.functions[1].functionName).toBe('function-two');
      expect(result.nextMarker).toBeNull();
    });

    it('should pass maxItems and marker query params', async () => {
      mockClient.get.mockResolvedValue({
        data: { Functions: [], NextMarker: null },
      });

      await AwsLambdaConnector.actions.listFunctions.handler(mockContext, {
        maxItems: 5,
        marker: 'token123',
      });

      expect(mockClient.get).toHaveBeenCalledWith(
        expect.stringMatching(/Marker=token123/),
        expect.any(Object)
      );
      expect(mockClient.get).toHaveBeenCalledWith(
        expect.stringMatching(/MaxItems=5/),
        expect.any(Object)
      );
    });

    it('should handle pagination with nextMarker', async () => {
      mockClient.get.mockResolvedValue({
        data: {
          Functions: [
            {
              FunctionName: 'fn-a',
              FunctionArn: 'arn:a',
              Runtime: 'nodejs18.x',
              Description: '',
              LastModified: '',
              MemorySize: 128,
              Timeout: 3,
              Handler: 'index.handler',
            },
          ],
          NextMarker: 'next-page-token',
        },
      });

      const result = (await AwsLambdaConnector.actions.listFunctions.handler(mockContext, {
        maxItems: 1,
      })) as { nextMarker: string | null };

      expect(result.nextMarker).toBe('next-page-token');
    });
  });

  describe('getFunction action', () => {
    it('should get function details', async () => {
      mockClient.get.mockResolvedValue({
        data: {
          Configuration: {
            FunctionName: 'my-function',
            FunctionArn: 'arn:aws:lambda:us-east-1:123456789:function:my-function',
            Runtime: 'nodejs18.x',
            Role: 'arn:aws:iam::123456789:role/lambda-role',
            Handler: 'index.handler',
            Description: 'A test function',
            Timeout: 30,
            MemorySize: 256,
            LastModified: '2025-01-15T10:00:00.000+0000',
            State: 'Active',
            LastUpdateStatus: 'Successful',
          },
        },
      });

      const result = (await AwsLambdaConnector.actions.getFunction.handler(mockContext, {
        functionName: 'my-function',
      })) as Record<string, unknown>;

      expect(mockClient.get).toHaveBeenCalledWith(
        expect.stringContaining('/2015-03-31/functions/my-function'),
        expect.any(Object)
      );

      expect(result).toEqual({
        functionName: 'my-function',
        functionArn: 'arn:aws:lambda:us-east-1:123456789:function:my-function',
        runtime: 'nodejs18.x',
        role: 'arn:aws:iam::123456789:role/lambda-role',
        handler: 'index.handler',
        description: 'A test function',
        timeout: 30,
        memorySize: 256,
        lastModified: '2025-01-15T10:00:00.000+0000',
        state: 'Active',
        lastUpdateStatus: 'Successful',
      });
    });

    it('should pass qualifier when getting a specific version', async () => {
      mockClient.get.mockResolvedValue({
        data: {
          Configuration: {
            FunctionName: 'versioned-fn',
            FunctionArn: 'arn:aws:lambda:us-east-1:123456789:function:versioned-fn:5',
            Runtime: 'python3.12',
            Role: 'arn:aws:iam::123456789:role/role',
            Handler: 'handler.main',
            Description: '',
            Timeout: 10,
            MemorySize: 128,
            LastModified: '2025-01-01T00:00:00.000+0000',
            State: 'Active',
            LastUpdateStatus: 'Successful',
          },
        },
      });

      await AwsLambdaConnector.actions.getFunction.handler(mockContext, {
        functionName: 'versioned-fn',
        qualifier: '5',
      });

      expect(mockClient.get).toHaveBeenCalledWith(
        expect.stringContaining('Qualifier=5'),
        expect.any(Object)
      );
    });
  });

  describe('error handling', () => {
    it('should handle authentication errors (401)', async () => {
      mockClient.get.mockRejectedValue({
        response: {
          status: 401,
          statusText: 'Unauthorized',
          data: {},
        },
      });

      await expect(
        AwsLambdaConnector.actions.listFunctions.handler(mockContext, {})
      ).rejects.toThrow('Authentication failed');
    });

    it('should handle authorization errors (403)', async () => {
      mockClient.get.mockRejectedValue({
        response: {
          status: 403,
          statusText: 'Forbidden',
          data: {},
        },
      });

      await expect(
        AwsLambdaConnector.actions.listFunctions.handler(mockContext, {})
      ).rejects.toThrow('Access denied');
    });

    it('should handle Lambda JSON error responses', async () => {
      mockClient.get.mockRejectedValue({
        response: {
          status: 400,
          statusText: 'Bad Request',
          data: {
            Type: 'User',
            Message: 'Invalid function name',
          },
        },
      });

      await expect(
        AwsLambdaConnector.actions.getFunction.handler(mockContext, {
          functionName: '',
        })
      ).rejects.toThrow('AWS Lambda Error [User]: Invalid function name');
    });

    it('should handle generic network errors', async () => {
      mockClient.get.mockRejectedValue(new Error('Network timeout'));

      await expect(
        AwsLambdaConnector.actions.listFunctions.handler(mockContext, {})
      ).rejects.toThrow('AWS Lambda API request failed: Network timeout');
    });
  });

  describe('test handler', () => {
    it('should return success when API is accessible', async () => {
      mockClient.get.mockResolvedValue({
        data: { Functions: [] },
      });

      if (!AwsLambdaConnector.test) {
        throw new Error('Test handler not defined');
      }
      const result = await AwsLambdaConnector.test.handler(mockContext);

      expect(mockClient.get).toHaveBeenCalledWith(
        expect.stringContaining('/2015-03-31/functions/'),
        expect.any(Object)
      );
      expect(result).toEqual({
        ok: true,
        message: 'Successfully connected to AWS Lambda API',
      });
    });

    it('should return failure when API is not accessible', async () => {
      mockClient.get.mockRejectedValue(new Error('Invalid credentials'));

      if (!AwsLambdaConnector.test) {
        throw new Error('Test handler not defined');
      }
      const result = await AwsLambdaConnector.test.handler(mockContext);

      expect(result.ok).toBe(false);
      expect(result.message).toContain('Failed to connect');
    });
  });
});
