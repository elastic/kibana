/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { join, sep } from 'path';
import { REPO_ROOT } from '@kbn/repo-info';
import type { KibanaRequest } from '@kbn/core/server';
import { httpResourcesMock } from '@kbn/core/server/mocks';
import { loggingSystemMock } from '@kbn/core/public/mocks';
import { getComponentData } from './get_component_data';
import { getComponentCodeowners } from '../../lib/codeowners/get_component_codeowners';
import type { GetComponentDataRequestBody } from './get_component_data';

jest.mock('../../lib/codeowners/get_component_codeowners');

describe('getComponentData', () => {
  const mockRequest = {
    body: {
      path: join(REPO_ROOT, 'src', 'test-file.tsx'),
    },
  } as KibanaRequest<any, any, GetComponentDataRequestBody>;

  const mockResponse = httpResourcesMock.createResponseFactory();

  const mockLogger = loggingSystemMock.create().get();

  beforeEach(() => {
    jest.clearAllMocks();
    (getComponentCodeowners as jest.Mock).mockReturnValue(['@user1', '@team/owners']);
  });

  it('should return correct component data', async () => {
    const expectedPath = join('src', 'test-file.tsx');

    await getComponentData({
      req: mockRequest,
      res: mockResponse,
      logger: mockLogger,
    });

    expect(mockLogger.debug).toHaveBeenCalledWith(
      `Inspecting component at path: ${mockRequest.body.path}`
    );
    expect(getComponentCodeowners).toHaveBeenCalledWith(expectedPath);

    expect(mockResponse.ok).toHaveBeenCalledWith({
      body: {
        codeowners: ['@user1', '@team/owners'],
        relativePath: expectedPath,
        baseFileName: 'test-file.tsx',
      },
    });
  });

  it('should handle paths with multiple segments correctly', async () => {
    const path = join(REPO_ROOT, 'src', 'nested', 'folder', 'component.tsx');
    const expectedPath = join('src', 'nested', 'folder', 'component.tsx');

    const customRequest = {
      body: { path },
    } as KibanaRequest<any, any, GetComponentDataRequestBody>;

    await getComponentData({
      req: customRequest,
      res: mockResponse,
      logger: mockLogger,
    });

    expect(getComponentCodeowners).toHaveBeenCalledWith(expectedPath);
    expect(mockResponse.ok).toHaveBeenCalledWith({
      body: {
        codeowners: ['@user1', '@team/owners'],
        relativePath: expectedPath,
        baseFileName: 'component.tsx',
      },
    });
  });

  it('should handle edge case with empty file name gracefully', async () => {
    const path = join(REPO_ROOT, 'src', 'nested', sep);
    const expectedPath = join('src', 'nested', sep);

    const customRequest = {
      body: { path },
    } as KibanaRequest<any, any, GetComponentDataRequestBody>;

    await getComponentData({
      req: customRequest,
      res: mockResponse,
      logger: mockLogger,
    });

    expect(mockResponse.ok).toHaveBeenCalledWith({
      body: {
        codeowners: ['@user1', '@team/owners'],
        relativePath: expectedPath,
        baseFileName: '',
      },
    });
  });
});
