/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { defineTopic } from '@kbn/core/server';
import {
  WORKFLOW_EXECUTION_FINISHED_TOPIC_NAME,
  type WorkflowExecutionFinishedTopic,
} from '@kbn/workflows-topics';

/** Runtime token for {@link WORKFLOW_EXECUTION_FINISHED_TOPIC_NAME}. Consumers define their own. */
export const workflowExecutionFinishedTopic = defineTopic<WorkflowExecutionFinishedTopic>(
  WORKFLOW_EXECUTION_FINISHED_TOPIC_NAME
);
