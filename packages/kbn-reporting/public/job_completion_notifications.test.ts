/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import {
  getPendingJobIds,
  addPendingJobId,
  setPendingJobIds,
} from './job_completion_notifications';

describe('Job completion notifications', () => {
  afterEach(async () => {
    await setPendingJobIds([]);
  });

  it('initially contains not job IDs', async () => {
    expect(await getPendingJobIds()).toEqual([]);
  });

  it('handles multiple job ID additions', async () => {
    await addPendingJobId('job-123');
    await addPendingJobId('job-456');
    await addPendingJobId('job-789');
    expect(await getPendingJobIds()).toEqual(['job-123', 'job-456', 'job-789']);
  });

  it('handles setting a total of amount of job ID', async () => {
    await setPendingJobIds(['job-abc', 'job-def', 'job-ghi']);
    expect(await getPendingJobIds()).toEqual(['job-abc', 'job-def', 'job-ghi']);
  });
});
