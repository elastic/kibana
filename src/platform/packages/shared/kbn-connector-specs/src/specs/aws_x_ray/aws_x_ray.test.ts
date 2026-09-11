/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ActionContext } from '../../connector_spec';
import { AwsXRay } from './aws_x_ray';
import { GetInsightSummariesInputSchema } from './types';

describe('AwsXRay', () => {
  const mockClient = {
    post: jest.fn(),
  };

  // Credentials are stored as encrypted secrets (via aws_credentials auth type),
  // not in config. The SigV4 interceptor is configured on the axios instance by
  // the auth type, so action handlers receive a pre-configured client.
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
      expect(AwsXRay.metadata.id).toBe('.aws_x_ray');
      expect(AwsXRay.metadata.displayName).toBe('AWS X-Ray');
      expect(AwsXRay.auth?.types).toEqual(['aws_credentials']);
    });

    it('should only declare agentBuilder as a supported feature (new connector, pre-Production-NonCanary)', () => {
      expect(AwsXRay.metadata.supportedFeatureIds).toEqual(['agentBuilder']);
    });
  });

  describe('schema', () => {
    it('should only require region in config (credentials are in auth/secrets)', () => {
      const schema = AwsXRay.schema;
      expect(schema).toBeDefined();
      if (schema) {
        expect(Object.keys(schema.shape)).toEqual(['region']);
      }
    });
  });

  describe('getInsightSummaries action', () => {
    it('should list insight summaries for a group', async () => {
      mockClient.post.mockResolvedValue({
        status: 200,
        data: { InsightSummaries: [{ InsightId: 'abc-123' }], NextToken: null },
      });

      const result = await AwsXRay.actions.getInsightSummaries.handler(mockContext, {
        startTime: 1716200000,
        endTime: 1716203600,
        groupArn: 'arn:aws:xray:us-east-1:123456789012:group/default/abc123',
      });

      expect(mockClient.post).toHaveBeenCalledWith(
        'https://xray.us-east-1.amazonaws.com/InsightSummaries',
        JSON.stringify({
          StartTime: 1716200000,
          EndTime: 1716203600,
          GroupARN: 'arn:aws:xray:us-east-1:123456789012:group/default/abc123',
        }),
        expect.objectContaining({ headers: { 'Content-Type': 'application/json' } })
      );
      expect(result).toEqual({ InsightSummaries: [{ InsightId: 'abc-123' }], NextToken: null });
    });

    it('should pass optional maxResults, nextToken, and states', async () => {
      mockClient.post.mockResolvedValue({ status: 200, data: {} });

      await AwsXRay.actions.getInsightSummaries.handler(mockContext, {
        startTime: 1716200000,
        endTime: 1716203600,
        groupName: 'default',
        maxResults: 50,
        nextToken: 'page-2',
        states: ['ACTIVE'],
      });

      const [, sentBody] = mockClient.post.mock.calls[0];
      expect(JSON.parse(sentBody)).toEqual({
        StartTime: 1716200000,
        EndTime: 1716203600,
        GroupName: 'default',
        MaxResults: 50,
        NextToken: 'page-2',
        States: ['ACTIVE'],
      });
    });

    it('should require either groupArn or groupName', () => {
      const result = GetInsightSummariesInputSchema.safeParse({
        startTime: 1716200000,
        endTime: 1716203600,
      });
      expect(result.success).toBe(false);
    });

    it('should accept groupArn alone', () => {
      const result = GetInsightSummariesInputSchema.safeParse({
        startTime: 1716200000,
        endTime: 1716203600,
        groupArn: 'arn:aws:xray:us-east-1:123456789012:group/default/abc123',
      });
      expect(result.success).toBe(true);
    });
  });

  describe('getInsight action', () => {
    it('should get a single insight by id', async () => {
      mockClient.post.mockResolvedValue({
        status: 200,
        data: { Insight: { InsightId: '5f169f14-3021-4680-a72c-7ea3faa4b1c8' } },
      });

      const result = await AwsXRay.actions.getInsight.handler(mockContext, {
        insightId: '5f169f14-3021-4680-a72c-7ea3faa4b1c8',
      });

      expect(mockClient.post).toHaveBeenCalledWith(
        'https://xray.us-east-1.amazonaws.com/Insight',
        JSON.stringify({ InsightId: '5f169f14-3021-4680-a72c-7ea3faa4b1c8' }),
        expect.any(Object)
      );
      expect(result).toEqual({ Insight: { InsightId: '5f169f14-3021-4680-a72c-7ea3faa4b1c8' } });
    });
  });

  describe('getServiceGraph action', () => {
    it('should fetch the service graph for a time range', async () => {
      mockClient.post.mockResolvedValue({ status: 200, data: { Services: [] } });

      await AwsXRay.actions.getServiceGraph.handler(mockContext, {
        startTime: 1716200000,
        endTime: 1716203600,
      });

      expect(mockClient.post).toHaveBeenCalledWith(
        'https://xray.us-east-1.amazonaws.com/ServiceGraph',
        JSON.stringify({ StartTime: 1716200000, EndTime: 1716203600 }),
        expect.any(Object)
      );
    });
  });

  describe('getTraceSummaries action', () => {
    it('should search trace summaries with a filter expression', async () => {
      mockClient.post.mockResolvedValue({
        status: 200,
        data: { TraceSummaries: [{ Id: '1-58fb9b6b-b19c04eaa851f22a02e4b4ac' }] },
      });

      const result = await AwsXRay.actions.getTraceSummaries.handler(mockContext, {
        startTime: 1716200000,
        endTime: 1716203600,
        filterExpression: 'service("api.example.com")',
      });

      expect(mockClient.post).toHaveBeenCalledWith(
        'https://xray.us-east-1.amazonaws.com/TraceSummaries',
        JSON.stringify({
          StartTime: 1716200000,
          EndTime: 1716203600,
          FilterExpression: 'service("api.example.com")',
        }),
        expect.any(Object)
      );
      expect(result).toEqual({ TraceSummaries: [{ Id: '1-58fb9b6b-b19c04eaa851f22a02e4b4ac' }] });
    });

    it('should send samplingStrategy as a nested AWS-cased object', async () => {
      mockClient.post.mockResolvedValue({ status: 200, data: {} });

      await AwsXRay.actions.getTraceSummaries.handler(mockContext, {
        startTime: 1716200000,
        endTime: 1716203600,
        sampling: true,
        samplingStrategy: { name: 'FixedRate', value: 0.1 },
      });

      const [, sentBody] = mockClient.post.mock.calls[0];
      expect(JSON.parse(sentBody)).toEqual({
        StartTime: 1716200000,
        EndTime: 1716203600,
        Sampling: true,
        SamplingStrategy: { Name: 'FixedRate', Value: 0.1 },
      });
    });
  });

  describe('batchGetTraces action', () => {
    it('should retrieve full trace detail for up to 5 trace ids', async () => {
      mockClient.post.mockResolvedValue({
        status: 200,
        data: { Traces: [{ Id: '1-58fb9b6b-b19c04eaa851f22a02e4b4ac' }], UnprocessedTraceIds: [] },
      });

      const result = await AwsXRay.actions.batchGetTraces.handler(mockContext, {
        traceIds: ['1-58fb9b6b-b19c04eaa851f22a02e4b4ac'],
      });

      expect(mockClient.post).toHaveBeenCalledWith(
        'https://xray.us-east-1.amazonaws.com/Traces',
        JSON.stringify({ TraceIds: ['1-58fb9b6b-b19c04eaa851f22a02e4b4ac'] }),
        expect.any(Object)
      );
      expect(result).toEqual({
        Traces: [{ Id: '1-58fb9b6b-b19c04eaa851f22a02e4b4ac' }],
        UnprocessedTraceIds: [],
      });
    });
  });

  describe('getInsightImpactGraph action', () => {
    it('should fetch the impact graph for an insight', async () => {
      mockClient.post.mockResolvedValue({ status: 200, data: { Services: [] } });

      await AwsXRay.actions.getInsightImpactGraph.handler(mockContext, {
        insightId: '5f169f14-3021-4680-a72c-7ea3faa4b1c8',
        startTime: 1716200000,
        endTime: 1716200600,
      });

      expect(mockClient.post).toHaveBeenCalledWith(
        'https://xray.us-east-1.amazonaws.com/InsightImpactGraph',
        JSON.stringify({
          InsightId: '5f169f14-3021-4680-a72c-7ea3faa4b1c8',
          StartTime: 1716200000,
          EndTime: 1716200600,
        }),
        expect.any(Object)
      );
    });
  });

  describe('getInsightEvents action', () => {
    it('should fetch the insight event timeline', async () => {
      mockClient.post.mockResolvedValue({ status: 200, data: { InsightEvents: [] } });

      await AwsXRay.actions.getInsightEvents.handler(mockContext, {
        insightId: '5f169f14-3021-4680-a72c-7ea3faa4b1c8',
        maxResults: 10,
      });

      expect(mockClient.post).toHaveBeenCalledWith(
        'https://xray.us-east-1.amazonaws.com/InsightEvents',
        JSON.stringify({ InsightId: '5f169f14-3021-4680-a72c-7ea3faa4b1c8', MaxResults: 10 }),
        expect.any(Object)
      );
    });
  });

  describe('getTimeSeriesServiceStatistics action', () => {
    it('should fetch time series statistics for a group', async () => {
      mockClient.post.mockResolvedValue({ status: 200, data: { TimeSeriesServiceStatistics: [] } });

      await AwsXRay.actions.getTimeSeriesServiceStatistics.handler(mockContext, {
        startTime: 1716200000,
        endTime: 1716203600,
        groupName: 'default',
        period: 60,
      });

      expect(mockClient.post).toHaveBeenCalledWith(
        'https://xray.us-east-1.amazonaws.com/TimeSeriesServiceStatistics',
        JSON.stringify({
          StartTime: 1716200000,
          EndTime: 1716203600,
          GroupName: 'default',
          Period: 60,
        }),
        expect.any(Object)
      );
    });
  });

  describe('getGroups action', () => {
    it('should list all active groups', async () => {
      mockClient.post.mockResolvedValue({
        status: 200,
        data: { Groups: [{ GroupName: 'default' }] },
      });

      const result = await AwsXRay.actions.getGroups.handler(mockContext, {});

      expect(mockClient.post).toHaveBeenCalledWith(
        'https://xray.us-east-1.amazonaws.com/Groups',
        JSON.stringify({}),
        expect.any(Object)
      );
      expect(result).toEqual({ Groups: [{ GroupName: 'default' }] });
    });
  });

  describe('getTraceGraph action', () => {
    it('should build a graph for specific trace ids', async () => {
      mockClient.post.mockResolvedValue({ status: 200, data: { Services: [] } });

      await AwsXRay.actions.getTraceGraph.handler(mockContext, {
        traceIds: ['1-58fb9b6b-b19c04eaa851f22a02e4b4ac'],
      });

      expect(mockClient.post).toHaveBeenCalledWith(
        'https://xray.us-east-1.amazonaws.com/TraceGraph',
        JSON.stringify({ TraceIds: ['1-58fb9b6b-b19c04eaa851f22a02e4b4ac'] }),
        expect.any(Object)
      );
    });
  });

  describe('startTraceRetrieval action', () => {
    it('should start an async retrieval job and return a retrieval token', async () => {
      mockClient.post.mockResolvedValue({
        status: 200,
        data: { RetrievalToken: 'retrieval-token-123' },
      });

      const result = await AwsXRay.actions.startTraceRetrieval.handler(mockContext, {
        startTime: 1716200000,
        endTime: 1716203600,
        traceIds: [],
      });

      expect(mockClient.post).toHaveBeenCalledWith(
        'https://xray.us-east-1.amazonaws.com/StartTraceRetrieval',
        JSON.stringify({ StartTime: 1716200000, EndTime: 1716203600, TraceIds: [] }),
        expect.any(Object)
      );
      expect(result).toEqual({ RetrievalToken: 'retrieval-token-123' });
    });
  });

  describe('getRetrievedTracesGraph action', () => {
    it('should fetch the graph for a completed retrieval', async () => {
      mockClient.post.mockResolvedValue({
        status: 200,
        data: { RetrievalStatus: 'COMPLETE', Services: [] },
      });

      const result = await AwsXRay.actions.getRetrievedTracesGraph.handler(mockContext, {
        retrievalToken: 'retrieval-token-123',
      });

      expect(mockClient.post).toHaveBeenCalledWith(
        'https://xray.us-east-1.amazonaws.com/GetRetrievedTracesGraph',
        JSON.stringify({ RetrievalToken: 'retrieval-token-123' }),
        expect.any(Object)
      );
      expect(result).toEqual({ RetrievalStatus: 'COMPLETE', Services: [] });
    });
  });

  describe('getSamplingRules action', () => {
    it('should list sampling rules', async () => {
      mockClient.post.mockResolvedValue({
        status: 200,
        data: { SamplingRuleRecords: [] },
      });

      const result = await AwsXRay.actions.getSamplingRules.handler(mockContext, {});

      expect(mockClient.post).toHaveBeenCalledWith(
        'https://xray.us-east-1.amazonaws.com/GetSamplingRules',
        JSON.stringify({}),
        expect.any(Object)
      );
      expect(result).toEqual({ SamplingRuleRecords: [] });
    });
  });

  describe('error handling', () => {
    it('should throw an authentication error on 403', async () => {
      mockClient.post.mockRejectedValue({
        response: {
          status: 403,
          statusText: 'Forbidden',
          headers: { 'x-amzn-errortype': 'AccessDeniedException' },
          data: { message: 'User is not authorized to perform xray:GetGroups' },
        },
      });

      await expect(AwsXRay.actions.getGroups.handler(mockContext, {})).rejects.toThrow(
        'Authentication failed'
      );
    });

    it('should surface the AWS error type and message for a 400', async () => {
      mockClient.post.mockRejectedValue({
        response: {
          status: 400,
          statusText: 'Bad Request',
          headers: { 'x-amzn-errortype': 'InvalidRequestException:http://internal.amazon.com/...' },
          data: { message: 'Missing required parameter: StartTime' },
        },
      });

      await expect(
        AwsXRay.actions.getServiceGraph.handler(mockContext, {
          startTime: 1716200000,
          endTime: 1716203600,
        })
      ).rejects.toThrow(
        'AWS X-Ray Error [InvalidRequestException]: Missing required parameter: StartTime'
      );
    });

    it('should handle generic network errors', async () => {
      mockClient.post.mockRejectedValue(new Error('Network timeout'));

      await expect(AwsXRay.actions.getGroups.handler(mockContext, {})).rejects.toThrow(
        'AWS X-Ray API request failed: Network timeout'
      );
    });
  });

  describe('test handler', () => {
    it('should return successfully when the API is accessible', async () => {
      mockClient.post.mockResolvedValue({ status: 200, data: { Groups: [] } });

      if (!AwsXRay.test) {
        throw new Error('Test handler not defined');
      }
      const result = await AwsXRay.test.handler(mockContext);

      expect(mockClient.post).toHaveBeenCalledWith(
        'https://xray.us-east-1.amazonaws.com/Groups',
        JSON.stringify({}),
        expect.any(Object)
      );
      expect(result).toEqual({});
    });

    it('should throw when the API is not accessible', async () => {
      mockClient.post.mockRejectedValue({
        response: { status: 403, statusText: 'Forbidden', headers: {}, data: {} },
      });

      if (!AwsXRay.test) {
        throw new Error('Test handler not defined');
      }
      await expect(AwsXRay.test.handler(mockContext)).rejects.toThrow('Authentication failed');
    });
  });
});
