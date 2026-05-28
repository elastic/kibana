/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ActionContext } from '../../connector_spec';
import { getConnectorSpec } from '../../..';
import { BigQuery } from './bigquery';

describe('BigQuery', () => {
  const mockClient = {
    get: jest.fn(),
    post: jest.fn(),
  };

  const mockContext = {
    client: mockClient,
    config: {
      projectId: 'elastic-edm-prod',
      location: 'US',
      maximumBytesBilled: '10000000000',
    },
    log: { debug: jest.fn(), error: jest.fn() },
  } as unknown as ActionContext;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('metadata and wiring', () => {
    it('should be discoverable via getConnectorSpec', () => {
      const spec = getConnectorSpec('.bigquery');
      expect(spec).toBe(BigQuery);
      expect(spec?.actions.runQuery.isTool).toBe(true);
    });

    it('should use the shared GCP service account auth type', () => {
      expect(BigQuery.auth?.types).toEqual(['gcp_service_account']);
    });

    it('should support workflows and agentBuilder features', () => {
      expect(BigQuery.metadata.supportedFeatureIds).toContain('workflows');
      expect(BigQuery.metadata.supportedFeatureIds).toContain('agentBuilder');
    });
  });

  describe('schema', () => {
    it('should require projectId and default location to US', () => {
      const schema = BigQuery.schema;
      if (!schema) {
        throw new Error('BigQuery spec is missing a config schema');
      }

      const parsed = schema.parse({ projectId: 'elastic-edm-prod' });
      expect(parsed).toEqual({
        projectId: 'elastic-edm-prod',
        location: 'US',
      });
    });
  });

  describe('runQuery', () => {
    const queryResponse = {
      jobComplete: true,
      jobReference: {
        projectId: 'elastic-edm-prod',
        jobId: 'job_123',
        location: 'US',
      },
      schema: {
        fields: [
          { name: 'account_name', type: 'STRING' },
          { name: 'executions', type: 'INT64' },
          { name: 'revenue', type: 'NUMERIC' },
        ],
      },
      rows: [
        {
          f: [{ v: 'Ahead, Inc.' }, { v: '318' }, { v: '5.72' }],
        },
      ],
      totalRows: '1',
      totalBytesProcessed: '2048',
    };

    it('should submit read-only SQL to BigQuery jobs.query and normalize rows', async () => {
      mockClient.post.mockResolvedValue({ data: queryResponse });

      const result = await BigQuery.actions.runQuery.handler(mockContext, {
        query:
          'SELECT account_name, executions, revenue FROM `elastic-edm-prod.pa__rpt.rpt__cloud__billing_usage` LIMIT 1',
        maxResults: 10,
        timeoutMs: 30000,
        useQueryCache: false,
      });

      expect(mockClient.post).toHaveBeenCalledWith(
        'https://bigquery.googleapis.com/bigquery/v2/projects/elastic-edm-prod/queries',
        {
          query:
            'SELECT account_name, executions, revenue FROM `elastic-edm-prod.pa__rpt.rpt__cloud__billing_usage` LIMIT 1',
          useLegacySql: false,
          location: 'US',
          maxResults: 10,
          timeoutMs: 30000,
          useQueryCache: false,
          maximumBytesBilled: '10000000000',
        }
      );
      expect(result).toEqual(
        expect.objectContaining({
          jobComplete: true,
          totalRows: '1',
          rows: [{ account_name: 'Ahead, Inc.', executions: '318', revenue: '5.72' }],
          rawRows: queryResponse.rows,
        })
      );
    });

    it('should accept WITH, EXPLAIN, comments, and trailing semicolon', async () => {
      mockClient.post.mockResolvedValue({ data: { jobComplete: true, rows: [] } });

      await BigQuery.actions.runQuery.handler(mockContext, {
        query: 'WITH x AS (SELECT 1) SELECT * FROM x',
      });
      await BigQuery.actions.runQuery.handler(mockContext, { query: '-- note\nEXPLAIN SELECT 1' });
      await BigQuery.actions.runQuery.handler(mockContext, { query: 'SELECT 1;' });

      expect(mockClient.post).toHaveBeenCalledTimes(3);
    });

    it('should reject write, DDL, and multi-statement SQL for agent-facing runQuery', async () => {
      await expect(
        BigQuery.actions.runQuery.handler(mockContext, {
          query: 'INSERT INTO dataset.table VALUES (1)',
        })
      ).rejects.toThrow('runQuery only accepts read-only BigQuery GoogleSQL statements');

      await expect(
        BigQuery.actions.runQuery.handler(mockContext, {
          query: 'CREATE TABLE dataset.table AS SELECT 1',
        })
      ).rejects.toThrow('runQuery only accepts read-only BigQuery GoogleSQL statements');

      await expect(
        BigQuery.actions.runQuery.handler(mockContext, {
          query: 'SELECT 1; SELECT 2',
        })
      ).rejects.toThrow('runQuery only accepts read-only BigQuery GoogleSQL statements');

      expect(mockClient.post).not.toHaveBeenCalled();
    });
  });

  describe('executeQuery', () => {
    it('should be workflow-only and allow dry runs', async () => {
      mockClient.post.mockResolvedValue({
        data: {
          jobComplete: true,
          totalBytesProcessed: '12345',
        },
      });

      expect(BigQuery.actions.executeQuery.isTool).toBe(false);

      const result = await BigQuery.actions.executeQuery.handler(mockContext, {
        query: 'CREATE TEMP TABLE t AS SELECT 1',
        dryRun: true,
      });

      expect(mockClient.post).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          query: 'CREATE TEMP TABLE t AS SELECT 1',
          dryRun: true,
        })
      );
      expect(result).toEqual(expect.objectContaining({ totalBytesProcessed: '12345' }));
    });
  });

  describe('getQueryResults', () => {
    it('should fetch and normalize results for a BigQuery job', async () => {
      mockClient.get.mockResolvedValue({
        data: {
          jobComplete: true,
          schema: { fields: [{ name: 'ok', type: 'INT64' }] },
          rows: [{ f: [{ v: '1' }] }],
          pageToken: 'next-token',
        },
      });

      const result = await BigQuery.actions.getQueryResults.handler(mockContext, {
        jobId: 'job_123',
        location: 'US',
        maxResults: 1,
        pageToken: 'page-1',
      });

      expect(mockClient.get).toHaveBeenCalledWith(
        'https://bigquery.googleapis.com/bigquery/v2/projects/elastic-edm-prod/queries/job_123',
        {
          params: {
            location: 'US',
            maxResults: 1,
            pageToken: 'page-1',
          },
        }
      );
      expect(result).toEqual(
        expect.objectContaining({
          rows: [{ ok: '1' }],
          pageToken: 'next-token',
        })
      );
    });
  });

  describe('listDatasets', () => {
    it('should list datasets in the configured project', async () => {
      mockClient.get.mockResolvedValue({
        data: {
          datasets: [{ datasetReference: { datasetId: 'pa__rpt' } }],
        },
      });

      const result = await BigQuery.actions.listDatasets.handler(mockContext, {
        maxResults: 20,
      });

      expect(mockClient.get).toHaveBeenCalledWith(
        'https://bigquery.googleapis.com/bigquery/v2/projects/elastic-edm-prod/datasets',
        { params: { maxResults: 20 } }
      );
      expect(result).toEqual({
        datasets: [{ datasetReference: { datasetId: 'pa__rpt' } }],
      });
    });
  });

  describe('error handling', () => {
    it('should surface BigQuery JSON errors', async () => {
      mockClient.post.mockRejectedValue({
        response: {
          status: 403,
          statusText: 'Forbidden',
          data: {
            error: {
              code: 403,
              status: 'PERMISSION_DENIED',
              message: 'Access denied',
            },
          },
        },
      });

      await expect(
        BigQuery.actions.runQuery.handler(mockContext, { query: 'SELECT 1' })
      ).rejects.toThrow('BigQuery API error [PERMISSION_DENIED]: Access denied');
    });
  });

  describe('test handler', () => {
    it('should return success when SELECT 1 succeeds', async () => {
      mockClient.post.mockResolvedValue({
        data: {
          jobComplete: true,
          jobReference: { jobId: 'job_test' },
        },
      });

      if (!BigQuery.test) {
        throw new Error('BigQuery test handler is missing');
      }

      const result = await BigQuery.test.handler(mockContext);

      expect(mockClient.post).toHaveBeenCalledWith(
        'https://bigquery.googleapis.com/bigquery/v2/projects/elastic-edm-prod/queries',
        expect.objectContaining({
          query: 'SELECT 1 AS ok',
          useLegacySql: false,
          location: 'US',
          maxResults: 1,
        })
      );
      expect(result).toEqual({
        ok: true,
        message: 'Successfully connected to BigQuery (job job_test)',
      });
    });
  });
});
