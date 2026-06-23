/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/** Hidden data stream name for workflow executions. */
export const WORKFLOWS_EXECUTIONS_INDEX = '.workflows-executions';

/** Hidden data stream name for workflow step executions. */
export const WORKFLOWS_STEP_EXECUTIONS_INDEX = '.workflows-step-executions';

/** Prefix of workflow execution backing indices (`.ds-.workflows-executions-{tail}`). */
export const WORKFLOWS_EXECUTIONS_DATA_STREAM_BACKING_PREFIX = `.ds-${WORKFLOWS_EXECUTIONS_INDEX}-`;

/** Prefix of step execution backing indices (`.ds-.workflows-step-executions-{tail}`). */
export const WORKFLOWS_STEP_EXECUTIONS_DATA_STREAM_BACKING_PREFIX = `.ds-${WORKFLOWS_STEP_EXECUTIONS_INDEX}-`;
