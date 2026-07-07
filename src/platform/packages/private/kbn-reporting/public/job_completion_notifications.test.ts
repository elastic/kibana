/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { jobCompletionNotifications } from './job_completion_notifications';

describe('Job completion notifications', () => {
  const { setPendingJobIds, getPendingJobIds, addPendingJobId } = jobCompletionNotifications();

  afterEach(async () => {
    setPendingJobIds([]);
  });

  it('initially contains not job IDs', async () => {
    expect(getPendingJobIds()).toEqual([]);
  });

  it('handles multiple job ID additions', async () => {
    addPendingJobId('job-123');
    addPendingJobId('job-456');
    addPendingJobId('job-789');
    expect(getPendingJobIds()).toEqual(['job-123', 'job-456', 'job-789']);
  });

  it('handles setting a total of amount of job ID', async () => {
    setPendingJobIds(['job-abc', 'job-def', 'job-ghi']);
    expect(getPendingJobIds()).toEqual(['job-abc', 'job-def', 'job-ghi']);
  });

  it('able to clear all jobIds', async () => {
    setPendingJobIds(['job-abc', 'job-def', 'job-ghi']);
    setPendingJobIds([]);
    expect(getPendingJobIds()).toEqual([]);
  });
});
