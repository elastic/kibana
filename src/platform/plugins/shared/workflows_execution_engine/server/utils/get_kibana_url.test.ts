/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { CloudSetup } from '@kbn/cloud-plugin/server';
import type { CoreStart } from '@kbn/core/server';
import { buildWorkflowExecutionUrl, getKibanaUrl } from './get_kibana_url';

describe('getKibanaUrl', () => {
  it('returns publicBaseUrl when available', () => {
    const coreStart = {
      http: {
        basePath: {
          publicBaseUrl: 'https://kibana.example.com',
        },
      },
    } as CoreStart;

    expect(getKibanaUrl(coreStart)).toBe('https://kibana.example.com');
  });

  it('returns cloud kibanaUrl when publicBaseUrl is not available', () => {
    const coreStart = {
      http: {
        basePath: {},
      },
    } as CoreStart;
    const cloudSetup = {
      kibanaUrl: 'https://cloud.kibana.example.com',
    } as CloudSetup;

    expect(getKibanaUrl(coreStart, cloudSetup)).toBe('https://cloud.kibana.example.com');
  });

  it('builds URL from server info when neither publicBaseUrl nor cloud URL is available', () => {
    const coreStart = {
      http: {
        basePath: {
          prepend: jest.fn((path: string) => `/base-path${path}`),
        },
        getServerInfo: jest.fn(() => ({
          protocol: 'https',
          hostname: 'localhost',
          port: 5601,
        })),
      },
    } as unknown as CoreStart;

    expect(getKibanaUrl(coreStart)).toBe('https://localhost:5601/base-path');
  });

  it('returns localhost fallback when no core start is provided', () => {
    expect(getKibanaUrl()).toBe('http://localhost:5601');
  });
});

describe('buildWorkflowExecutionUrl', () => {
  it('builds URL for default space', () => {
    const url = buildWorkflowExecutionUrl(
      'https://kibana.example.com',
      'default',
      'workflow-123',
      'execution-456'
    );

    expect(url).toBe(
      'https://kibana.example.com/app/workflows/workflow-123?executionId=execution-456&tab=executions'
    );
  });

  it('builds URL for non-default space', () => {
    const url = buildWorkflowExecutionUrl(
      'https://kibana.example.com',
      'my-space',
      'workflow-123',
      'execution-456'
    );

    expect(url).toBe(
      'https://kibana.example.com/s/my-space/app/workflows/workflow-123?executionId=execution-456&tab=executions'
    );
  });

  it('builds URL with stepExecutionId', () => {
    const url = buildWorkflowExecutionUrl(
      'https://kibana.example.com',
      'default',
      'workflow-123',
      'execution-456',
      'step-789'
    );

    expect(url).toBe(
      'https://kibana.example.com/app/workflows/workflow-123?executionId=execution-456&tab=executions&stepExecutionId=step-789'
    );
  });

  it('builds URL matching user example format', () => {
    const url = buildWorkflowExecutionUrl(
      'http://localhost:5601/fbi',
      'default',
      '8e737e4c-e9cf-422a-b690-0acb9368b050',
      '050a6b75-59ef-4137-9708-e1c8a9a30e4c',
      '99ce063eca45a6e84646538924fd2a989a6085a1fdf874c553deeae46d6ce13c'
    );

    expect(url).toBe(
      'http://localhost:5601/fbi/app/workflows/8e737e4c-e9cf-422a-b690-0acb9368b050?executionId=050a6b75-59ef-4137-9708-e1c8a9a30e4c&tab=executions&stepExecutionId=99ce063eca45a6e84646538924fd2a989a6085a1fdf874c553deeae46d6ce13c'
    );
  });
});
