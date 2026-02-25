/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { CloudSetup } from '@kbn/cloud-plugin/server';
import type { Logger } from '@kbn/core/server';
import type { EsWorkflowExecution } from '@kbn/workflows';
import { ExecutionStatus } from '@kbn/workflows';

import { BUCKET_SIZE_MS, METERING_SOURCE_ID, WORKFLOWS_USAGE_TYPE } from './constants';
import { WorkflowsMeteringService } from './metering_service';
import type { UsageRecord } from './types';
import type { UsageReportingService } from './usage_reporting_service';

const createMockExecution = (
  overrides: Partial<EsWorkflowExecution> = {}
): EsWorkflowExecution => ({
  id: 'exec-123',
  spaceId: 'default',
  workflowId: 'wf-456',
  isTestRun: false,
  status: ExecutionStatus.COMPLETED,
  context: {},
  workflowDefinition: {
    steps: [
      { name: 'step1', type: 'connector', with: {} },
      { name: 'step2', type: 'connector', with: {} },
      { name: 'step3', type: 'transform', with: {} },
    ],
  } as EsWorkflowExecution['workflowDefinition'],
  yaml: '',
  scopeStack: [],
  createdAt: '2026-01-01T00:00:00.000Z',
  error: null,
  createdBy: 'test-user',
  startedAt: '2026-01-01T00:00:01.000Z',
  finishedAt: '2026-01-01T00:05:01.000Z',
  cancelRequested: false,
  duration: 300000, // 5 minutes in ms
  triggeredBy: 'manual',
  ...overrides,
});

const createMockLogger = (): jest.Mocked<Logger> =>
  ({
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    fatal: jest.fn(),
    trace: jest.fn(),
    get: jest.fn(),
    isLevelEnabled: jest.fn(),
    log: jest.fn(),
  } as unknown as jest.Mocked<Logger>);

const createMockUsageReportingService = (): jest.Mocked<UsageReportingService> =>
  ({
    reportUsage: jest.fn().mockResolvedValue({ ok: true, status: 200 }),
  } as unknown as jest.Mocked<UsageReportingService>);

const createMockCloudSetup = (overrides: Partial<CloudSetup> = {}): CloudSetup =>
  ({
    serverless: { projectId: 'test-project-id' },
    deploymentId: undefined,
    ...overrides,
  } as unknown as CloudSetup);

describe('WorkflowsMeteringService', () => {
  let meteringService: WorkflowsMeteringService;
  let mockUsageReportingService: jest.Mocked<UsageReportingService>;
  let mockLogger: jest.Mocked<Logger>;

  beforeEach(() => {
    mockUsageReportingService = createMockUsageReportingService();
    mockLogger = createMockLogger();
    meteringService = new WorkflowsMeteringService(mockUsageReportingService, mockLogger);
    // Mock the internal delay to be instant so tests run fast
    jest.spyOn(WorkflowsMeteringService.prototype as any, 'delay').mockResolvedValue(undefined);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('reportWorkflowExecution', () => {
    it('should send a usage record for a completed execution (serverless)', async () => {
      const execution = createMockExecution();
      const cloudSetup = createMockCloudSetup();

      await meteringService.reportWorkflowExecution(execution, cloudSetup);

      expect(mockUsageReportingService.reportUsage).toHaveBeenCalledTimes(1);
      const sentRecords: UsageRecord[] = mockUsageReportingService.reportUsage.mock.calls[0][0];
      expect(sentRecords).toHaveLength(1);

      const record = sentRecords[0];
      expect(record.id).toBe('workflow-execution-exec-123');
      expect(record.usage.type).toBe(WORKFLOWS_USAGE_TYPE);
      expect(record.usage.quantity).toBe(1);
      expect(record.source.id).toBe(METERING_SOURCE_ID);
      expect(record.source.instance_group_id).toBe('test-project-id');
    });

    it('should use deploymentId when projectId is not available (ECH)', async () => {
      const execution = createMockExecution();
      const cloudSetup = createMockCloudSetup({
        serverless: undefined,
        deploymentId: 'deploy-789',
      } as Partial<CloudSetup>);

      await meteringService.reportWorkflowExecution(execution, cloudSetup);

      const sentRecords: UsageRecord[] = mockUsageReportingService.reportUsage.mock.calls[0][0];
      expect(sentRecords[0].source.instance_group_id).toBe('deploy-789');
    });

    it('should not send usage record when no instanceGroupId (self-managed)', async () => {
      const execution = createMockExecution();
      const cloudSetup = createMockCloudSetup({
        serverless: undefined,
        deploymentId: undefined,
      } as Partial<CloudSetup>);

      await meteringService.reportWorkflowExecution(execution, cloudSetup);

      expect(mockUsageReportingService.reportUsage).not.toHaveBeenCalled();
    });

    it('should not send usage record when cloudSetup is undefined', async () => {
      const execution = createMockExecution();

      await meteringService.reportWorkflowExecution(execution, undefined);

      expect(mockUsageReportingService.reportUsage).not.toHaveBeenCalled();
    });

    it('should not send usage record for non-terminal states', async () => {
      const cloudSetup = createMockCloudSetup();

      for (const status of [
        ExecutionStatus.PENDING,
        ExecutionStatus.RUNNING,
        ExecutionStatus.WAITING,
        ExecutionStatus.WAITING_FOR_INPUT,
      ]) {
        await meteringService.reportWorkflowExecution(createMockExecution({ status }), cloudSetup);
      }

      expect(mockUsageReportingService.reportUsage).not.toHaveBeenCalled();
    });

    it('should not send usage record for skipped executions', async () => {
      const cloudSetup = createMockCloudSetup();

      await meteringService.reportWorkflowExecution(
        createMockExecution({ status: ExecutionStatus.SKIPPED }),
        cloudSetup
      );

      expect(mockUsageReportingService.reportUsage).not.toHaveBeenCalled();
    });

    it('should send usage records for all billable terminal states', async () => {
      const cloudSetup = createMockCloudSetup();

      const billableStatuses = [
        ExecutionStatus.COMPLETED,
        ExecutionStatus.FAILED,
        ExecutionStatus.CANCELLED,
        ExecutionStatus.TIMED_OUT,
      ];

      for (const status of billableStatuses) {
        await meteringService.reportWorkflowExecution(
          createMockExecution({ status, id: `exec-${status}` }),
          cloudSetup
        );
      }

      expect(mockUsageReportingService.reportUsage).toHaveBeenCalledTimes(billableStatuses.length);
    });
  });

  describe('buildUsageRecord (via reportWorkflowExecution)', () => {
    it('should populate metadata with correct values', async () => {
      const execution = createMockExecution({
        duration: 300000, // 5 minutes
        status: ExecutionStatus.COMPLETED,
        isTestRun: true,
        triggeredBy: 'scheduled',
      });
      const cloudSetup = createMockCloudSetup();

      await meteringService.reportWorkflowExecution(execution, cloudSetup);

      const record: UsageRecord = mockUsageReportingService.reportUsage.mock.calls[0][0][0];
      const { metadata } = record.usage;

      expect(metadata).toBeDefined();
      expect(metadata!.duration_ms).toBe('300000');
      expect(metadata!.duration_minutes).toBe('5');
      expect(metadata!.status).toBe('completed');
      expect(metadata!.triggered_by).toBe('scheduled');
      expect(metadata!.is_test_run).toBe('true');
      expect(metadata!.workflow_id).toBe('wf-456');
      expect(metadata!.space_id).toBe('default');
    });

    it('should calculate normalized_quantity correctly for 5-min buckets', async () => {
      const testCases = [
        { durationMs: 0, expected: 1 }, // Min 1 bucket
        { durationMs: 1000, expected: 1 }, // 1 second -> 1 bucket
        { durationMs: BUCKET_SIZE_MS, expected: 1 }, // Exactly 1 bucket
        { durationMs: BUCKET_SIZE_MS + 1, expected: 2 }, // Just over 1 bucket
        { durationMs: BUCKET_SIZE_MS * 3, expected: 3 }, // Exactly 3 buckets
        { durationMs: BUCKET_SIZE_MS * 3 + 1, expected: 4 }, // Just over 3 buckets
      ];

      for (const { durationMs, expected } of testCases) {
        mockUsageReportingService.reportUsage.mockClear();
        const execution = createMockExecution({ duration: durationMs });
        const cloudSetup = createMockCloudSetup();

        await meteringService.reportWorkflowExecution(execution, cloudSetup);

        const record: UsageRecord = mockUsageReportingService.reportUsage.mock.calls[0][0][0];
        expect(record.usage.metadata!.normalized_quantity).toBe(String(expected));
      }
    });

    it('should extract step types from workflow definition', async () => {
      const execution = createMockExecution({
        workflowDefinition: {
          steps: [
            { name: 's1', type: 'connector', with: {} },
            { name: 's2', type: 'connector', with: {} },
            { name: 's3', type: 'transform', with: {} },
            { name: 's4', type: 'ai', with: {} },
          ],
        } as EsWorkflowExecution['workflowDefinition'],
      });
      const cloudSetup = createMockCloudSetup();

      await meteringService.reportWorkflowExecution(execution, cloudSetup);

      const record: UsageRecord = mockUsageReportingService.reportUsage.mock.calls[0][0][0];
      const { metadata } = record.usage;

      expect(metadata!.step_count).toBe('4');
      const stepTypes = JSON.parse(metadata!.step_types);
      expect(stepTypes).toEqual({ connector: 2, transform: 1, ai: 1 });
    });

    it('should handle missing workflow definition gracefully', async () => {
      const execution = createMockExecution({
        workflowDefinition: undefined as unknown as EsWorkflowExecution['workflowDefinition'],
      });
      const cloudSetup = createMockCloudSetup();

      await meteringService.reportWorkflowExecution(execution, cloudSetup);

      const record: UsageRecord = mockUsageReportingService.reportUsage.mock.calls[0][0][0];
      expect(record.usage.metadata!.step_count).toBe('0');
      expect(record.usage.metadata!.step_types).toBeUndefined();
    });

    it('should set deterministic ID for deduplication', async () => {
      const execution = createMockExecution({ id: 'unique-id-42' });
      const cloudSetup = createMockCloudSetup();

      await meteringService.reportWorkflowExecution(execution, cloudSetup);

      const record: UsageRecord = mockUsageReportingService.reportUsage.mock.calls[0][0][0];
      expect(record.id).toBe('workflow-execution-unique-id-42');
    });

    it('should use finishedAt as usage_timestamp', async () => {
      const finishedAt = '2026-02-01T12:00:00.000Z';
      const execution = createMockExecution({ finishedAt });
      const cloudSetup = createMockCloudSetup();

      await meteringService.reportWorkflowExecution(execution, cloudSetup);

      const record: UsageRecord = mockUsageReportingService.reportUsage.mock.calls[0][0][0];
      expect(record.usage_timestamp).toBe(finishedAt);
    });

    it('should set period_seconds based on duration', async () => {
      const execution = createMockExecution({ duration: 120000 }); // 2 minutes
      const cloudSetup = createMockCloudSetup();

      await meteringService.reportWorkflowExecution(execution, cloudSetup);

      const record: UsageRecord = mockUsageReportingService.reportUsage.mock.calls[0][0][0];
      expect(record.usage.period_seconds).toBe(120);
    });

    it('should default triggeredBy to unknown when not set', async () => {
      const execution = createMockExecution({ triggeredBy: undefined });
      const cloudSetup = createMockCloudSetup();

      await meteringService.reportWorkflowExecution(execution, cloudSetup);

      const record: UsageRecord = mockUsageReportingService.reportUsage.mock.calls[0][0][0];
      expect(record.usage.metadata!.triggered_by).toBe('unknown');
    });
  });

  describe('retry logic', () => {
    it('should retry on failure and succeed on second attempt', async () => {
      mockUsageReportingService.reportUsage
        .mockResolvedValueOnce({ ok: false, status: 500 } as any)
        .mockResolvedValueOnce({ ok: true, status: 200 } as any);

      const execution = createMockExecution();
      const cloudSetup = createMockCloudSetup();

      await meteringService.reportWorkflowExecution(execution, cloudSetup);

      expect(mockUsageReportingService.reportUsage).toHaveBeenCalledTimes(2);
      expect(mockLogger.debug).toHaveBeenCalledWith(
        expect.stringContaining('Successfully reported metering')
      );
    });

    it('should log error after all retries exhausted', async () => {
      mockUsageReportingService.reportUsage.mockResolvedValue({
        ok: false,
        status: 503,
      } as any);

      const execution = createMockExecution();
      const cloudSetup = createMockCloudSetup();

      await meteringService.reportWorkflowExecution(execution, cloudSetup);

      expect(mockUsageReportingService.reportUsage).toHaveBeenCalledTimes(3);
      expect(mockLogger.error).toHaveBeenCalledWith(
        expect.stringContaining('Failed to report workflow metering')
      );
    });

    it('should retry on network errors', async () => {
      mockUsageReportingService.reportUsage
        .mockRejectedValueOnce(new Error('ECONNREFUSED'))
        .mockResolvedValueOnce({ ok: true, status: 200 } as any);

      const execution = createMockExecution();
      const cloudSetup = createMockCloudSetup();

      await meteringService.reportWorkflowExecution(execution, cloudSetup);

      expect(mockUsageReportingService.reportUsage).toHaveBeenCalledTimes(2);
      expect(mockLogger.warn).toHaveBeenCalledWith(expect.stringContaining('ECONNREFUSED'));
    });

    it('should not throw when metering fails (errors are caught internally)', async () => {
      mockUsageReportingService.reportUsage.mockRejectedValue(new Error('catastrophic failure'));

      const execution = createMockExecution();
      const cloudSetup = createMockCloudSetup();

      // Should not throw - errors are caught internally
      await expect(
        meteringService.reportWorkflowExecution(execution, cloudSetup)
      ).resolves.toBeUndefined();

      // Error should be logged
      expect(mockLogger.error).toHaveBeenCalledWith(
        expect.stringContaining('Failed to report workflow metering')
      );
    });
  });

  describe('environment detection', () => {
    it('should prefer projectId over deploymentId', async () => {
      const execution = createMockExecution();
      const cloudSetup = createMockCloudSetup({
        serverless: { projectId: 'proj-123' },
        deploymentId: 'deploy-456',
      } as Partial<CloudSetup>);

      await meteringService.reportWorkflowExecution(execution, cloudSetup);

      const record: UsageRecord = mockUsageReportingService.reportUsage.mock.calls[0][0][0];
      expect(record.source.instance_group_id).toBe('proj-123');
    });
  });
});
