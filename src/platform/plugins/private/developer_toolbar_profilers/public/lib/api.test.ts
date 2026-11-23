/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { httpServiceMock } from '@kbn/core/public/mocks';
import { startProfile, stopProfile } from './api';

describe('profiler api', () => {
  it('starts a profile', async () => {
    const http = httpServiceMock.createStartContract();
    await startProfile(http, 'memory');
    expect(http.post).toHaveBeenCalledWith(
      '/internal/developer_toolbar_profilers/memory_profile/start'
    );
  });

  it('stops a profile and uses the file name from the server', async () => {
    const http = httpServiceMock.createStartContract();
    const fileName = 'kibana-cpu-profile-2026-11-02_11-28.cpuprofile';
    http.post.mockResolvedValue({
      body: { nodes: [] },
      response: new Response(null, {
        headers: { 'content-disposition': `attachment; filename="${fileName}"` },
      }),
    });

    const file = await stopProfile(http, 'cpu');

    expect(http.post).toHaveBeenCalledWith(
      '/internal/developer_toolbar_profilers/cpu_profile/stop',
      {
        asResponse: true,
      }
    );
    expect(file.fileName).toBe(fileName);
    expect(file.blob.type).toBe('application/json');
  });

  it('falls back to a generated file name', async () => {
    const http = httpServiceMock.createStartContract();
    http.post.mockResolvedValue({ body: { head: {}, samples: [] } });

    const { fileName } = await stopProfile(http, 'memory');

    expect(fileName).toMatch(/^kibana-memory-profile-\d{4}-\d{2}-\d{2}_\d{2}-\d{2}\.heapprofile$/);
  });
});
