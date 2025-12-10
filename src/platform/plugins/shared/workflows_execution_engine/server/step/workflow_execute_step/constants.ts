/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/**
 * Polling interval for checking sub-workflow execution status.
 * When a workflow.execute step is waiting for a sub-workflow to complete,
 * it will schedule resume tasks at this interval to check the status.
 */
export const SUB_WORKFLOW_POLL_INTERVAL = '1s';
