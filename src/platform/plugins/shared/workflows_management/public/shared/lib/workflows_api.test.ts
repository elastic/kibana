/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { HttpSetup } from '@kbn/core/public';
import { httpServiceMock } from '@kbn/core/public/mocks';
import { createWorkflow, updateWorkflow } from './workflows_api';

describe('createWorkflow', () => {
  it('calls http.post with the correct path and body', async () => {
    const http = httpServiceMock.createStartContract();
    const yaml = 'name: test-workflow\nsteps: []';

    await createWorkflow(http as unknown as HttpSetup, yaml);

    expect(http.post).toHaveBeenCalledTimes(1);
    expect(http.post).toHaveBeenCalledWith('/api/workflows', {
      body: JSON.stringify({ yaml }),
    });
  });

  it('returns the response from http.post', async () => {
    const http = httpServiceMock.createStartContract();
    const mockResponse = { id: 'wf-123', name: 'test' };
    http.post.mockResolvedValue(mockResponse);

    const result = await createWorkflow(http as unknown as HttpSetup, 'name: test');
    expect(result).toBe(mockResponse);
  });

  it('propagates errors from http.post', async () => {
    const http = httpServiceMock.createStartContract();
    const error = new Error('Network error');
    http.post.mockRejectedValue(error);

    await expect(createWorkflow(http as unknown as HttpSetup, 'name: test')).rejects.toThrow(
      'Network error'
    );
  });
});

describe('updateWorkflow', () => {
  it('calls http.put with the correct path including workflow id', async () => {
    const http = httpServiceMock.createStartContract();
    const id = 'wf-42';
    const yaml = 'name: updated-workflow';

    await updateWorkflow(http as unknown as HttpSetup, id, yaml);

    expect(http.put).toHaveBeenCalledTimes(1);
    expect(http.put).toHaveBeenCalledWith('/api/workflows/wf-42', {
      body: JSON.stringify({ yaml }),
    });
  });

  it('uses the id in the URL path', async () => {
    const http = httpServiceMock.createStartContract();

    await updateWorkflow(http as unknown as HttpSetup, 'my-special-id', 'yaml: content');

    expect(http.put).toHaveBeenCalledWith(
      '/api/workflows/my-special-id',
      expect.objectContaining({ body: expect.any(String) })
    );
  });

  it('propagates errors from http.put', async () => {
    const http = httpServiceMock.createStartContract();
    const error = new Error('Forbidden');
    http.put.mockRejectedValue(error);

    await expect(
      updateWorkflow(http as unknown as HttpSetup, 'wf-1', 'yaml: content')
    ).rejects.toThrow('Forbidden');
  });

  it('serializes the yaml in the request body', async () => {
    const http = httpServiceMock.createStartContract();
    const yaml = 'name: my-workflow\nsteps:\n  - type: .slack.postMessage';

    await updateWorkflow(http as unknown as HttpSetup, 'id-1', yaml);

    const callBody = (http.put.mock.calls[0] as unknown as [string, { body: string }])[1]
      ?.body as string;
    expect(JSON.parse(callBody)).toEqual({ yaml });
  });
});
