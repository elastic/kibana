/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { loggerMock } from '@kbn/logging-mocks';
import { preprocessAlertInputs } from './preprocess_alert_inputs';
import { preprocessDocumentInputs } from './preprocess_document_inputs';
import { MAX_EXPANDED_EVENT_BYTES, preprocessTriggerInputs } from './preprocess_trigger_inputs';
import { WorkflowTriggerInputError } from '../../../workflow_trigger_input_error';
import type { AlertPreprocessingContext } from '../../../workflows_management_api';

jest.mock('./preprocess_alert_inputs');
jest.mock('./preprocess_document_inputs');

const mockPreprocessAlertInputs = jest.mocked(preprocessAlertInputs);
const mockPreprocessDocumentInputs = jest.mocked(preprocessDocumentInputs);

describe('preprocessTriggerInputs', () => {
  const logger = loggerMock.create();
  const context = {} as AlertPreprocessingContext;
  const inputs = { event: { triggerType: 'document', documentIds: [] } };

  beforeEach(() => {
    jest.clearAllMocks();
    mockPreprocessAlertInputs.mockImplementation(async (value) => value);
    mockPreprocessDocumentInputs.mockImplementation(async (value) => value);
  });

  it('runs alert expansion, then document expansion on its result', async () => {
    const afterAlerts = { event: { triggerType: 'alert', alerts: [] } };
    const afterDocuments = { event: { triggerType: 'document', documents: [] } };
    mockPreprocessAlertInputs.mockResolvedValue(afterAlerts);
    mockPreprocessDocumentInputs.mockResolvedValue(afterDocuments);

    const result = await preprocessTriggerInputs(inputs, context, 'default', logger);

    expect(mockPreprocessAlertInputs).toHaveBeenCalledWith(inputs, context, 'default', logger);
    expect(mockPreprocessDocumentInputs).toHaveBeenCalledWith(afterAlerts, context, logger);
    expect(result).toBe(afterDocuments);
  });

  it('skips the kinds the caller did not allow', async () => {
    const result = await preprocessTriggerInputs(inputs, context, 'default', logger, ['alertIds']);

    expect(mockPreprocessAlertInputs).toHaveBeenCalled();
    expect(mockPreprocessDocumentInputs).not.toHaveBeenCalled();
    expect(result).toBe(inputs);
  });

  it('rejects an expanded event larger than the byte budget', async () => {
    mockPreprocessDocumentInputs.mockResolvedValue({
      event: { documents: [{ big: 'x'.repeat(MAX_EXPANDED_EVENT_BYTES) }] },
    });

    const result = preprocessTriggerInputs(inputs, context, 'default', logger);

    await expect(result).rejects.toBeInstanceOf(WorkflowTriggerInputError);
    await expect(result).rejects.toThrow('limit for a workflow run');
  });

  it('does not measure inputs that nothing expanded', async () => {
    const large = { event: { documents: [{ big: 'x'.repeat(MAX_EXPANDED_EVENT_BYTES) }] } };

    await expect(preprocessTriggerInputs(large, context, 'default', logger)).resolves.toBe(large);
  });
});
