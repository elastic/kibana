/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { Logger } from '@kbn/core/server';
import { preprocessAlertInputs } from './preprocess_alert_inputs';
import { preprocessDocumentInputs } from './preprocess_document_inputs';
import type { AlertPreprocessingContext } from '../../../workflows_management_api';

/**
 * Expands any compact trigger selection in `inputs` into the event shape workflows consume.
 *
 * Each step inspects `event.triggerType` and returns `inputs` untouched when it does not apply,
 * so this is safe to call unconditionally for every run.
 */
export async function preprocessTriggerInputs(
  inputs: Record<string, unknown>,
  context: AlertPreprocessingContext,
  spaceId: string,
  logger: Logger
): Promise<Record<string, unknown>> {
  const withExpandedAlerts = await preprocessAlertInputs(inputs, context, spaceId, logger);
  return preprocessDocumentInputs(withExpandedAlerts, context, logger);
}
