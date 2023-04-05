/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

export interface BuildkiteMetadata {
  buildId?: string;
  jobId?: string;
  url?: string;
  jobName?: string;
  jobUrl?: string;
}

export function getBuildkiteMetadata(): BuildkiteMetadata {
  // Buildkite steps that use `parallelism` need a numerical suffix added to identify them
  // We should also increment the number by one, since it's 0-based
  const jobNumberSuffix = process.env.BUILDKITE_PARALLEL_JOB
    ? ` #${parseInt(process.env.BUILDKITE_PARALLEL_JOB, 10) + 1}`
    : '';

  const buildUrl = process.env.BUILDKITE_BUILD_URL;
  const jobUrl = process.env.BUILDKITE_JOB_ID
    ? `${buildUrl}#${process.env.BUILDKITE_JOB_ID}`
    : undefined;

  return {
    buildId: process.env.BUJILDKITE_BUILD_ID,
    jobId: process.env.BUILDKITE_JOB_ID,
    url: buildUrl,
    jobUrl,
    jobName: process.env.BUILDKITE_LABEL
      ? `${process.env.BUILDKITE_LABEL}${jobNumberSuffix}`
      : undefined,
  };
}
