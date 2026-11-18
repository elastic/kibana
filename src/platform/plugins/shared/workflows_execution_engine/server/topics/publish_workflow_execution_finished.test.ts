/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { pubSubServiceMock } from '@kbn/core-pubsub-server-mocks';
import { loggerMock } from '@kbn/logging-mocks';
import type { WorkflowExecutionFinishedData } from '@kbn/workflows-topics';
import {
  publishWorkflowExecutionFinished,
  setWorkflowExecutionFinishedPublisher,
} from './publish_workflow_execution_finished';
import { workflowExecutionFinishedTopic } from './workflow_execution_finished';

const finished: WorkflowExecutionFinishedData = {
  executionId: 'exec-1',
  workflowId: 'wf-1',
  spaceId: 'default',
  status: 'completed',
  finishedAt: '2026-01-01T00:00:00.000Z',
  isTestRun: false,
};

describe('publishWorkflowExecutionFinished', () => {
  const logger = loggerMock.create();

  beforeEach(() => {
    setWorkflowExecutionFinishedPublisher(undefined);
    jest.clearAllMocks();
  });

  afterEach(() => {
    setWorkflowExecutionFinishedPublisher(undefined);
  });

  it('does nothing when no publisher is installed', async () => {
    await expect(publishWorkflowExecutionFinished(finished)).resolves.toBeUndefined();
    expect(logger.warn).not.toHaveBeenCalled();
  });

  it('publishes the execution id and the finished data', async () => {
    const pubsub = pubSubServiceMock.createStartContract();
    setWorkflowExecutionFinishedPublisher({ pubsub, logger });

    await publishWorkflowExecutionFinished(finished);

    expect(pubsub.publish).toHaveBeenCalledWith(workflowExecutionFinishedTopic, {
      id: finished.executionId,
      data: finished,
    });
    expect(logger.warn).not.toHaveBeenCalled();
  });

  it('logs a rejected publish and does not throw', async () => {
    const pubsub = pubSubServiceMock.createStartContract();
    pubsub.publish.mockRejectedValue(new Error('bus stopped'));
    setWorkflowExecutionFinishedPublisher({ pubsub, logger });

    await expect(publishWorkflowExecutionFinished(finished)).resolves.toBeUndefined();
    expect(logger.warn).toHaveBeenCalledWith(
      'Failed to publish workflow execution finished (execution=exec-1): bus stopped'
    );
  });

  it('does nothing after the publisher is cleared', async () => {
    const pubsub = pubSubServiceMock.createStartContract();
    setWorkflowExecutionFinishedPublisher({ pubsub, logger });
    setWorkflowExecutionFinishedPublisher(undefined);

    await publishWorkflowExecutionFinished(finished);

    expect(pubsub.publish).not.toHaveBeenCalled();
  });
});
