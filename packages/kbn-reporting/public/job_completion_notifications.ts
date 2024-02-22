/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { JOB_COMPLETION_NOTIFICATIONS_SESSION_KEY } from '@kbn/reporting-common';
import { JobId } from '@kbn/reporting-common/types';

// Reading and writing to the local storage must be atomic,
// i.e. performed in a single operation. This storage queue
// Operations on the localStorage key can happen from various
// parts of code. Using a queue to manage async operations allows
// operations to process one at a time
let operationQueue = Promise.resolve();
async function addToQueue(func: (error: Error | null) => void) {
  operationQueue = operationQueue.then(() => func(null)).catch(func);
  await operationQueue;
}

export async function getPendingJobIds(): Promise<JobId[]> {
  let jobs: JobId[] = [];
  await addToQueue(async () => {
    // get the current jobs
    const jobsData = localStorage.getItem(JOB_COMPLETION_NOTIFICATIONS_SESSION_KEY);
    jobs = jobsData ? JSON.parse(jobsData) : [];
  });
  return jobs;
}

export async function addPendingJobId(jobId: JobId) {
  addToQueue(async (error: Error | null) => {
    return new Promise((resolve, reject) => {
      if (error) {
        window.console.error(error);
        reject(error);
      }
      // get the current jobs synchronously
      const jobsData = localStorage.getItem(JOB_COMPLETION_NOTIFICATIONS_SESSION_KEY);
      const jobs: JobId[] = jobsData ? JSON.parse(jobsData) : [];
      // add the new job
      jobs.push(jobId);
      // write back to local storage
      localStorage.setItem(JOB_COMPLETION_NOTIFICATIONS_SESSION_KEY, JSON.stringify(jobs));
      resolve();
    });
  });
}

export async function setPendingJobIds(jobIds: JobId[]) {
  addToQueue(async (error: Error | null) => {
    return new Promise((resolve, reject) => {
      if (error) {
        reject(error);
      }
      // write update jobs back to local storage
      localStorage.setItem(JOB_COMPLETION_NOTIFICATIONS_SESSION_KEY, JSON.stringify(jobIds));
      resolve();
    });
  });
}
