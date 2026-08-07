/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ActionContext } from '../../connector_spec';
import { pascalKeysToCamel } from './aws_cloudwatch_api';
import { AwsCloudwatch } from './aws_cloudwatch';
import {
  FilterLogEventsInputSchema,
  GetMetricDataInputSchema,
  MetricDataQuerySchema,
  PutMetricAlarmInputSchema,
  StartLogsQueryInputSchema,
} from './types';

describe('AWS CloudWatch connector', () => {
  const mockPost = jest.fn();
  const mockClient = { post: mockPost };

  const mockContext = {
    client: mockClient,
    config: { region: 'us-east-1' },
    log: { debug: jest.fn(), error: jest.fn() },
  } as unknown as ActionContext;

  const jsonResponse = (data: unknown) => ({ data });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('metadata', () => {
    it('has the expected id and display name', () => {
      expect(AwsCloudwatch.metadata.id).toBe('.aws_cloudwatch');
      expect(AwsCloudwatch.metadata.displayName).toBe('AWS CloudWatch');
    });

    it('only declares agentBuilder support (new connector, pre Production-NonCanary)', () => {
      expect(AwsCloudwatch.metadata.supportedFeatureIds).toEqual(['agentBuilder']);
    });

    it('uses the aws_credentials auth type', () => {
      expect(AwsCloudwatch.auth?.types).toEqual(['aws_credentials']);
    });
  });

  describe('pascalKeysToCamel', () => {
    it('converts top-level and nested PascalCase keys to camelCase', () => {
      expect(
        pascalKeysToCamel({
          MetricAlarms: [{ AlarmName: 'high-cpu', StateValue: 'OK' }],
          NextToken: 'abc',
        })
      ).toEqual({
        metricAlarms: [{ alarmName: 'high-cpu', stateValue: 'OK' }],
        nextToken: 'abc',
      });
    });

    it('lowercases acronym runs correctly, e.g. "OKActions" -> "okActions"', () => {
      expect(pascalKeysToCamel({ OKActions: ['arn:aws:sns:...'], ARN: 'abc' })).toEqual({
        okActions: ['arn:aws:sns:...'],
        arn: 'abc',
      });
    });

    it('leaves primitives and empty objects unchanged', () => {
      expect(pascalKeysToCamel('foo')).toBe('foo');
      expect(pascalKeysToCamel(42)).toBe(42);
      expect(pascalKeysToCamel(null)).toBe(null);
    });
  });

  describe('listAlarms', () => {
    it('calls DescribeAlarms and camel-cases the response', async () => {
      mockPost.mockResolvedValue(
        jsonResponse({ MetricAlarms: [{ AlarmName: 'high-cpu', StateValue: 'ALARM' }] })
      );

      const result = await AwsCloudwatch.actions.listAlarms.handler(mockContext, {
        stateValue: 'ALARM',
      });

      expect(mockPost).toHaveBeenCalledWith(
        'https://monitoring.us-east-1.amazonaws.com/',
        JSON.stringify({ StateValue: 'ALARM' }),
        {
          headers: {
            'X-Amz-Target': 'GraniteServiceVersion20100801.DescribeAlarms',
            'Content-Encoding': 'amz-1.0',
          },
        }
      );
      expect(result).toEqual({ metricAlarms: [{ alarmName: 'high-cpu', stateValue: 'ALARM' }] });
    });
  });

  describe('enableAlarmActions / disableAlarmActions', () => {
    it('enables actions for the given alarm names', async () => {
      mockPost.mockResolvedValue(jsonResponse({}));

      const result = await AwsCloudwatch.actions.enableAlarmActions.handler(mockContext, {
        alarmNames: ['high-cpu', 'low-disk'],
      });

      expect(mockPost).toHaveBeenCalledWith(
        'https://monitoring.us-east-1.amazonaws.com/',
        JSON.stringify({ AlarmNames: ['high-cpu', 'low-disk'] }),
        {
          headers: {
            'X-Amz-Target': 'GraniteServiceVersion20100801.EnableAlarmActions',
            'Content-Encoding': 'amz-1.0',
          },
        }
      );
      expect(result.message).toContain('Enabled actions for 2 alarm(s)');
    });

    it('disables actions for the given alarm names', async () => {
      mockPost.mockResolvedValue(jsonResponse({}));

      const result = await AwsCloudwatch.actions.disableAlarmActions.handler(mockContext, {
        alarmNames: ['high-cpu'],
      });

      expect(mockPost).toHaveBeenCalledWith(
        'https://monitoring.us-east-1.amazonaws.com/',
        JSON.stringify({ AlarmNames: ['high-cpu'] }),
        {
          headers: {
            'X-Amz-Target': 'GraniteServiceVersion20100801.DisableAlarmActions',
            'Content-Encoding': 'amz-1.0',
          },
        }
      );
      expect(result.message).toContain('Disabled actions for 1 alarm(s)');
    });
  });

  describe('setAlarmState', () => {
    it('stringifies stateReasonData as JSON', async () => {
      mockPost.mockResolvedValue(jsonResponse({}));

      await AwsCloudwatch.actions.setAlarmState.handler(mockContext, {
        alarmName: 'high-cpu',
        stateValue: 'OK',
        stateReason: 'Manually cleared',
        stateReasonData: { version: '1.0' },
      });

      expect(mockPost).toHaveBeenCalledWith(
        'https://monitoring.us-east-1.amazonaws.com/',
        JSON.stringify({
          AlarmName: 'high-cpu',
          StateValue: 'OK',
          StateReason: 'Manually cleared',
          StateReasonData: JSON.stringify({ version: '1.0' }),
        }),
        {
          headers: {
            'X-Amz-Target': 'GraniteServiceVersion20100801.SetAlarmState',
            'Content-Encoding': 'amz-1.0',
          },
        }
      );
    });
  });

  describe('getAlarmHistory', () => {
    it('converts ISO date filters to epoch seconds', async () => {
      mockPost.mockResolvedValue(jsonResponse({ AlarmHistoryItems: [] }));

      await AwsCloudwatch.actions.getAlarmHistory.handler(mockContext, {
        alarmName: 'high-cpu',
        startDate: '2024-01-15T00:00:00Z',
        endDate: '2024-01-16T00:00:00Z',
      });

      const [, body] = mockPost.mock.calls[0];
      const parsed = JSON.parse(body as string);
      expect(parsed.AlarmName).toBe('high-cpu');
      expect(parsed.StartDate).toBe(Math.floor(Date.parse('2024-01-15T00:00:00Z') / 1000));
      expect(parsed.EndDate).toBe(Math.floor(Date.parse('2024-01-16T00:00:00Z') / 1000));
    });
  });

  describe('putMetricAlarm', () => {
    it('builds a simple metric alarm request', async () => {
      mockPost.mockResolvedValue(jsonResponse({}));

      await AwsCloudwatch.actions.putMetricAlarm.handler(mockContext, {
        alarmName: 'high-cpu',
        comparisonOperator: 'GreaterThanThreshold',
        evaluationPeriods: 3,
        threshold: 80,
        metricName: 'CPUUtilization',
        namespace: 'AWS/EC2',
        statistic: 'Average',
        period: 300,
        dimensions: [{ name: 'InstanceId', value: 'i-1234567890abcdef0' }],
        alarmActions: ['arn:aws:sns:us-east-1:123456789012:alerts'],
      });

      const [, body] = mockPost.mock.calls[0];
      const parsed = JSON.parse(body as string);
      expect(parsed).toMatchObject({
        AlarmName: 'high-cpu',
        ComparisonOperator: 'GreaterThanThreshold',
        EvaluationPeriods: 3,
        Threshold: 80,
        MetricName: 'CPUUtilization',
        Namespace: 'AWS/EC2',
        Statistic: 'Average',
        Period: 300,
        Dimensions: [{ Name: 'InstanceId', Value: 'i-1234567890abcdef0' }],
        AlarmActions: ['arn:aws:sns:us-east-1:123456789012:alerts'],
      });
    });

    it('rejects an input with neither metricName nor metrics', () => {
      const result = PutMetricAlarmInputSchema.safeParse({
        alarmName: 'bad-alarm',
        comparisonOperator: 'GreaterThanThreshold',
        evaluationPeriods: 1,
      });
      expect(result.success).toBe(false);
    });

    it('rejects an input with both metricName and metrics', () => {
      const result = PutMetricAlarmInputSchema.safeParse({
        alarmName: 'bad-alarm',
        comparisonOperator: 'GreaterThanThreshold',
        evaluationPeriods: 1,
        metricName: 'CPUUtilization',
        metrics: [
          {
            id: 'm1',
            metricStat: {
              namespace: 'AWS/EC2',
              metricName: 'CPUUtilization',
              period: 60,
              stat: 'Average',
            },
          },
        ],
      });
      expect(result.success).toBe(false);
    });
  });

  describe('listMetrics', () => {
    it('passes namespace and dimension filters through', async () => {
      mockPost.mockResolvedValue(jsonResponse({ Metrics: [] }));

      await AwsCloudwatch.actions.listMetrics.handler(mockContext, {
        namespace: 'AWS/EC2',
        dimensions: [{ name: 'InstanceId' }],
      });

      const [, body] = mockPost.mock.calls[0];
      expect(JSON.parse(body as string)).toEqual({
        Namespace: 'AWS/EC2',
        Dimensions: [{ Name: 'InstanceId' }],
      });
    });
  });

  describe('getMetricData', () => {
    it('builds MetricDataQueries and converts times to epoch seconds', async () => {
      mockPost.mockResolvedValue(jsonResponse({ MetricDataResults: [] }));

      await AwsCloudwatch.actions.getMetricData.handler(mockContext, {
        metricDataQueries: [
          {
            id: 'm1',
            metricStat: {
              namespace: 'AWS/EC2',
              metricName: 'CPUUtilization',
              period: 300,
              stat: 'Average',
              dimensions: [{ name: 'InstanceId', value: 'i-abc' }],
            },
          },
          { id: 'errorRate', expression: 'm1 * 2', returnData: true },
        ],
        startTime: '2024-01-15T00:00:00Z',
        endTime: '2024-01-15T01:00:00Z',
      });

      const [url, body] = mockPost.mock.calls[0];
      expect(url).toBe('https://monitoring.us-east-1.amazonaws.com/');
      const parsed = JSON.parse(body as string);
      expect(parsed.MetricDataQueries).toEqual([
        {
          Id: 'm1',
          MetricStat: {
            Metric: {
              Namespace: 'AWS/EC2',
              MetricName: 'CPUUtilization',
              Dimensions: [{ Name: 'InstanceId', Value: 'i-abc' }],
            },
            Period: 300,
            Stat: 'Average',
          },
        },
        { Id: 'errorRate', Expression: 'm1 * 2', ReturnData: true },
      ]);
      expect(parsed.StartTime).toBe(Math.floor(Date.parse('2024-01-15T00:00:00Z') / 1000));
      expect(parsed.EndTime).toBe(Math.floor(Date.parse('2024-01-15T01:00:00Z') / 1000));
    });

    it('rejects a query that specifies both metricStat and expression', () => {
      const result = MetricDataQuerySchema.safeParse({
        id: 'm1',
        metricStat: {
          namespace: 'AWS/EC2',
          metricName: 'CPUUtilization',
          period: 60,
          stat: 'Average',
        },
        expression: 'm1 * 2',
      });
      expect(result.success).toBe(false);
    });

    it('rejects a query id that does not start with a lowercase letter', () => {
      const result = GetMetricDataInputSchema.safeParse({
        metricDataQueries: [{ id: 'M1', expression: 'SELECT 1' }],
        startTime: '2024-01-15T00:00:00Z',
        endTime: '2024-01-15T01:00:00Z',
      });
      expect(result.success).toBe(false);
    });
  });

  describe('getMetricWidgetImage', () => {
    it('requests a PNG image and returns it as base64', async () => {
      const pngBytes = Buffer.from([0x89, 0x50, 0x4e, 0x47]);
      mockPost.mockResolvedValue({ data: pngBytes });

      const result = await AwsCloudwatch.actions.getMetricWidgetImage.handler(mockContext, {
        metricWidget: '{"metrics":[["AWS/EC2","CPUUtilization"]]}',
      });

      expect(mockPost).toHaveBeenCalledWith(
        'https://monitoring.us-east-1.amazonaws.com/',
        JSON.stringify({
          MetricWidget: '{"metrics":[["AWS/EC2","CPUUtilization"]]}',
          OutputFormat: 'image/png',
        }),
        {
          headers: {
            'X-Amz-Target': 'GraniteServiceVersion20100801.GetMetricWidgetImage',
            'Content-Encoding': 'amz-1.0',
          },
          responseType: 'arraybuffer',
        }
      );
      expect(result).toEqual({
        contentType: 'image/png',
        encoding: 'base64',
        content: pngBytes.toString('base64'),
      });
    });

    it('throws a readable error when CloudWatch returns an empty image body', async () => {
      mockPost.mockResolvedValue({ data: new ArrayBuffer(0) });

      await expect(
        AwsCloudwatch.actions.getMetricWidgetImage.handler(mockContext, {
          metricWidget: '{"metrics":[["AWS/EC2","CPUUtilization"]]}',
        })
      ).rejects.toThrow('AWS CloudWatch returned an empty image');
    });
  });

  describe('listLogGroups', () => {
    it('calls DescribeLogGroups on the Logs API without camel-casing the response', async () => {
      mockPost.mockResolvedValue(jsonResponse({ logGroups: [{ logGroupName: 'my-group' }] }));

      const result = await AwsCloudwatch.actions.listLogGroups.handler(mockContext, {
        logGroupNamePrefix: 'my-',
      });

      expect(mockPost).toHaveBeenCalledWith(
        'https://logs.us-east-1.amazonaws.com/',
        JSON.stringify({ logGroupNamePrefix: 'my-' }),
        {
          headers: {
            'X-Amz-Target': 'Logs_20140328.DescribeLogGroups',
            'Content-Encoding': 'amz-1.0',
          },
        }
      );
      expect(result).toEqual({ logGroups: [{ logGroupName: 'my-group' }] });
    });
  });

  describe('filterLogEvents', () => {
    it('converts start/end times to epoch milliseconds', async () => {
      mockPost.mockResolvedValue(jsonResponse({ events: [] }));

      await AwsCloudwatch.actions.filterLogEvents.handler(mockContext, {
        logGroupName: 'my-group',
        filterPattern: 'ERROR',
        startTime: '2024-01-15T00:00:00Z',
        endTime: '2024-01-15T01:00:00Z',
      });

      const [, body] = mockPost.mock.calls[0];
      const parsed = JSON.parse(body as string);
      expect(parsed.logGroupName).toBe('my-group');
      expect(parsed.startTime).toBe(Date.parse('2024-01-15T00:00:00Z'));
      expect(parsed.endTime).toBe(Date.parse('2024-01-15T01:00:00Z'));
    });

    it('rejects an input with neither logGroupName nor logGroupIdentifier', () => {
      const result = FilterLogEventsInputSchema.safeParse({ filterPattern: 'ERROR' });
      expect(result.success).toBe(false);
    });

    it('rejects an input with both logGroupName and logGroupIdentifier', () => {
      const result = FilterLogEventsInputSchema.safeParse({
        logGroupName: 'a',
        logGroupIdentifier: 'arn:aws:logs:us-east-1:123456789012:log-group:a',
      });
      expect(result.success).toBe(false);
    });
  });

  describe('startLogsQuery / getLogsQueryResults', () => {
    it('starts a query with epoch-second times', async () => {
      mockPost.mockResolvedValue(jsonResponse({ queryId: 'abc-123' }));

      const result = await AwsCloudwatch.actions.startLogsQuery.handler(mockContext, {
        logGroupName: 'my-group',
        queryString: 'fields @message | limit 20',
        startTime: '2024-01-15T00:00:00Z',
        endTime: '2024-01-15T01:00:00Z',
      });

      expect(mockPost).toHaveBeenCalledWith(
        'https://logs.us-east-1.amazonaws.com/',
        JSON.stringify({
          queryString: 'fields @message | limit 20',
          startTime: Math.floor(Date.parse('2024-01-15T00:00:00Z') / 1000),
          endTime: Math.floor(Date.parse('2024-01-15T01:00:00Z') / 1000),
          logGroupName: 'my-group',
        }),
        {
          headers: {
            'X-Amz-Target': 'Logs_20140328.StartQuery',
            'Content-Encoding': 'amz-1.0',
          },
        }
      );
      expect(result).toEqual({ queryId: 'abc-123' });
    });

    it('validates that queryString is required', () => {
      const result = StartLogsQueryInputSchema.safeParse({
        logGroupName: 'my-group',
        startTime: '2024-01-15T00:00:00Z',
        endTime: '2024-01-15T01:00:00Z',
      });
      expect(result.success).toBe(false);
    });

    it('polls for results by queryId', async () => {
      mockPost.mockResolvedValue(jsonResponse({ status: 'Complete', results: [] }));

      const result = await AwsCloudwatch.actions.getLogsQueryResults.handler(mockContext, {
        queryId: 'abc-123',
      });

      expect(mockPost).toHaveBeenCalledWith(
        'https://logs.us-east-1.amazonaws.com/',
        JSON.stringify({ queryId: 'abc-123' }),
        {
          headers: {
            'X-Amz-Target': 'Logs_20140328.GetQueryResults',
            'Content-Encoding': 'amz-1.0',
          },
        }
      );
      expect(result).toEqual({ status: 'Complete', results: [] });
    });
  });

  describe('listLogAnomalies', () => {
    it('passes filters through to ListAnomalies', async () => {
      mockPost.mockResolvedValue(jsonResponse({ anomalies: [] }));

      await AwsCloudwatch.actions.listLogAnomalies.handler(mockContext, {
        anomalyDetectorArn: 'arn:aws:logs:us-east-1:123456789012:anomaly-detector:abc',
        suppressionState: 'UNSUPPRESSED',
      });

      expect(mockPost).toHaveBeenCalledWith(
        'https://logs.us-east-1.amazonaws.com/',
        JSON.stringify({
          anomalyDetectorArn: 'arn:aws:logs:us-east-1:123456789012:anomaly-detector:abc',
          suppressionState: 'UNSUPPRESSED',
        }),
        {
          headers: {
            'X-Amz-Target': 'Logs_20140328.ListAnomalies',
            'Content-Encoding': 'amz-1.0',
          },
        }
      );
    });
  });

  describe('error handling', () => {
    it('surfaces a readable message for a JSON protocol error response', async () => {
      mockPost.mockRejectedValue({
        response: {
          status: 400,
          data: { __type: 'com.amazonaws.cloudwatch#ResourceNotFound', message: 'Alarm not found' },
        },
      });

      await expect(
        AwsCloudwatch.actions.listAlarms.handler(mockContext, { alarmNames: ['missing'] })
      ).rejects.toThrow('AWS CloudWatch error (ResourceNotFound): Alarm not found');
    });

    it('surfaces a clear message on 403 access denied', async () => {
      mockPost.mockRejectedValue({ response: { status: 403 } });

      await expect(AwsCloudwatch.actions.listLogGroups.handler(mockContext, {})).rejects.toThrow(
        /access denied/i
      );
    });

    it('throws when CloudWatch returns an error body with an HTTP 200 status', async () => {
      // CloudWatch's JSON protocol can return an error payload (e.g. when a
      // required header like Content-Encoding is missing) with a 200 status
      // instead of a 4xx, so axios never rejects on its own.
      mockPost.mockResolvedValue(
        jsonResponse({ __type: 'com.amazon.coral.service#UnknownOperationException' })
      );

      await expect(AwsCloudwatch.actions.listMetrics.handler(mockContext, {})).rejects.toThrow(
        'AWS CloudWatch error (UnknownOperationException)'
      );
    });

    it('throws on a nested "Output"-wrapped error body (e.g. CloudWatch Logs 4xx)', async () => {
      mockPost.mockRejectedValue({
        response: {
          status: 400,
          data: {
            Output: { __type: 'com.amazon.coral.service#UnknownOperationException' },
            Version: '1.0',
          },
        },
      });

      await expect(AwsCloudwatch.actions.listLogGroups.handler(mockContext, {})).rejects.toThrow(
        'AWS CloudWatch Logs error (UnknownOperationException)'
      );
    });

    it('throws when the region config is missing', async () => {
      const contextWithoutRegion = { ...mockContext, config: {} } as unknown as ActionContext;

      await expect(
        AwsCloudwatch.actions.listAlarms.handler(contextWithoutRegion, {})
      ).rejects.toThrow(/region/i);
    });
  });

  describe('test handler', () => {
    it('reports success when ListMetrics succeeds', async () => {
      mockPost.mockResolvedValue(jsonResponse({ Metrics: [{ Namespace: 'AWS/EC2' }] }));

      const result = await AwsCloudwatch.test.handler(mockContext);
      expect(result).toMatchObject({});
    });

    it('rejects when the API call throws', async () => {
      mockPost.mockRejectedValue({ response: { status: 403 } });

      if (!AwsCloudwatch.test) {
        throw new Error('Test handler not defined');
      }
      await expect(AwsCloudwatch.test.handler(mockContext)).rejects.toThrow(/access denied/i);
    });

    it('rejects when CloudWatch returns a 200 with an error body', async () => {
      mockPost.mockResolvedValue(
        jsonResponse({ __type: 'com.amazon.coral.service#UnknownOperationException' })
      );

      if (!AwsCloudwatch.test) {
        throw new Error('Test handler not defined');
      }
      await expect(AwsCloudwatch.test.handler(mockContext)).rejects.toThrow(
        'AWS CloudWatch error (UnknownOperationException)'
      );
    });
  });
});
