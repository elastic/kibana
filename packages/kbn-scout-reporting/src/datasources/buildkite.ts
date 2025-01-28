/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/**
 * Buildkite info
 */
export interface BuildkiteMetadata {
  branch?: string;
  commit?: string;
  job_id?: string;
  message?: string;
  build: {
    id?: string;
    number?: string;
    url?: string;
  };
  pipeline: {
    id?: string;
    name?: string;
    slug?: string;
  };
  agent: {
    name?: string;
  };
  group: {
    id?: string;
    key?: string;
    label?: string;
  };
  step: {
    id?: string;
    key?: string;
    label?: string;
  };
  command?: string;
}

/**
 * Buildkite information extracted from environment variables
 *
 * This object is empty if the process is not running in a Buildkite pipeline.
 */
export const buildkite: BuildkiteMetadata =
  process.env.BUILDKITE === 'true'
    ? {
        branch: process.env.BUILDKITE_BRANCH,
        commit: process.env.BUILDKITE_COMMIT,
        job_id: process.env.BUILDKITE_JOB_ID,
        message: process.env.BUILDKITE_MESSAGE,
        build: {
          id: process.env.BUILDKITE_BUILD_ID,
          number: process.env.BUILDKITE_BUILD_NUMBER,
          url: process.env.BUILDKITE_BUILD_URL,
        },
        pipeline: {
          id: process.env.BUILDKITE_PIPELINE_ID,
          name: process.env.BUILDKITE_PIPELINE_NAME,
          slug: process.env.BUILDKITE_PIPELINE_SLUG,
        },
        agent: {
          name: process.env.BUILDKITE_AGENT_NAME,
        },
        group: {
          id: process.env.BUILDKITE_GROUP_ID,
          key: process.env.BUILDKITE_GROUP_KEY,
          label: process.env.BUILDKITE_GROUP_LABEL,
        },
        step: {
          id: process.env.BUILDKITE_STEP_ID,
          key: process.env.BUILDKITE_STEP_KEY,
          label: process.env.BUILDKITE_LABEL,
        },
        command: process.env.BUILDKITE_COMMAND,
      }
    : {
        build: {},
        pipeline: {},
        agent: {},
        group: {},
        step: {},
      };
