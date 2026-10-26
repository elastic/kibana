/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

const job = process.env.JOB ? `job-${process.env.JOB}-` : '';
const num = process.env.CI_PARALLEL_PROCESS_NUMBER
  ? `worker-${process.env.CI_PARALLEL_PROCESS_NUMBER}-`
  : '';

/**
 * A prefix string that is unique for each parallel CI process that
 * is an empty string outside of CI, so it can be safely injected
 * into strings as a prefix
 */
export const CI_PARALLEL_PROCESS_PREFIX = `${job}${num}`;
