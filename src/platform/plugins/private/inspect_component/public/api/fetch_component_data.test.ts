/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { httpServiceMock } from '@kbn/core/public/mocks';
import type { InspectComponentResponse } from './fetch_component_data';
import { fetchComponentData } from './fetch_component_data';

describe('fetchComponentData', () => {
  const mockHttpService = httpServiceMock.createStartContract();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should call httpService.post with correct parameters', async () => {
    const fileName = '/path/to/component.tsx';

    await fetchComponentData({ httpService: mockHttpService, fileName });

    expect(mockHttpService.post).toHaveBeenCalledWith('/internal/inspect_component/inspect', {
      body: JSON.stringify({ path: fileName }),
    });
  });

  it('should return the response when successful', async () => {
    const mockResponse: InspectComponentResponse = {
      codeowners: ['team1', 'team2'],
      relativePath: 'src/path/to/component.tsx',
      baseFileName: 'component.tsx',
    };

    mockHttpService.post.mockResolvedValueOnce(mockResponse);

    const result = await fetchComponentData({
      httpService: mockHttpService,
      fileName: '/path/to/component.tsx',
    });

    expect(result).toEqual(mockResponse);
  });

  it('should return null when an error occurs', async () => {
    mockHttpService.post.mockRejectedValueOnce(new Error('Network error'));

    const result = await fetchComponentData({
      httpService: mockHttpService,
      fileName: '/path/to/component.tsx',
    });

    expect(result).toBeNull();
  });
});
