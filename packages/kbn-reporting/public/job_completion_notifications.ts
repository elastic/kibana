/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { JOB_COMPLETION_NOTIFICATIONS_SESSION_KEY } from '@kbn/reporting-common';
import { JobId } from '@kbn/reporting-common/types';

export function jobCompletionNotifications() {
  function getPendingJobIds(): JobId[] {
    const jobs: JobId[] = [];
    // get all current jobs
    for (const key in localStorage) {
      // check if key belongs to us
      if (key.indexOf(JOB_COMPLETION_NOTIFICATIONS_SESSION_KEY) === 0) {
        // get jobId from key
        const jobId = key.replace(`${JOB_COMPLETION_NOTIFICATIONS_SESSION_KEY}-`, '');
        jobs.push(jobId);
      }
    }
    return jobs;
  }

  function addPendingJobId(jobId: JobId) {
    // write back to local storage, value doesn't matter
    localStorage.setItem(`${JOB_COMPLETION_NOTIFICATIONS_SESSION_KEY}-${jobId}`, jobId);
  }

  function setPendingJobIds(jobIds: JobId[]) {
    // clear reporting jobIds
    for (const key in localStorage) {
      if (key.indexOf(JOB_COMPLETION_NOTIFICATIONS_SESSION_KEY) === 0) {
        localStorage.removeItem(key);
      }
    }

    // write update jobs back to local storage
    for (let j = 0; j < jobIds.length; j++) {
      const jobId = jobIds[j];
      localStorage.setItem(`${JOB_COMPLETION_NOTIFICATIONS_SESSION_KEY}-${jobId}`, jobId);
    }
  }

  return {
    getPendingJobIds,
    addPendingJobId,
    setPendingJobIds,
  };
}
