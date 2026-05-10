/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { ExecutionError } from '@kbn/workflows/server';
import { formatBytes } from './errors';

export const ACTIONS_MAX_RESPONSE_CONTENT_LENGTH_CONFIG = 'xpack.actions.maxResponseContentLength';

interface ActionsResponseContentLengthLimitErrorOptions {
  limitBytes?: number;
  contentLengthBytes?: number;
  estimatedOutputBytes?: number;
  canOverrideWithMaxStepSize?: boolean;
}

const getSuggestedLimitBytes = (
  limitBytes: number | undefined,
  sizeBytes: number | undefined
): number | undefined =>
  limitBytes && sizeBytes && sizeBytes > limitBytes ? sizeBytes : undefined;

const getMaxStepSizeSuggestion = ({
  limitBytes,
  maxStepSizeSuggestedLimitBytes,
}: {
  limitBytes?: number;
  maxStepSizeSuggestedLimitBytes?: number;
}): string | undefined => {
  if (maxStepSizeSuggestedLimitBytes) {
    return `Set 'max-step-size' to at least ${formatBytes(
      maxStepSizeSuggestedLimitBytes
    )} on this step to raise both the workflow output limit and this connector request limit. Alternatively, increase "${ACTIONS_MAX_RESPONSE_CONTENT_LENGTH_CONFIG}" or reduce the connector response size.`;
  }

  if (limitBytes) {
    return `Set a larger 'max-step-size' on this step to raise both the workflow output limit and this connector request limit. Alternatively, increase "${ACTIONS_MAX_RESPONSE_CONTENT_LENGTH_CONFIG}" or reduce the connector response size.`;
  }

  return undefined;
};

/**
 * Error thrown when a connector response is rejected by the Actions HTTP client
 * before the workflow step can enforce `max-step-size`.
 */
export class ActionsResponseContentLengthLimitError extends ExecutionError {
  constructor(
    stepName: string,
    {
      limitBytes,
      contentLengthBytes,
      estimatedOutputBytes,
      canOverrideWithMaxStepSize,
    }: ActionsResponseContentLengthLimitErrorOptions = {}
  ) {
    const formattedLimit = limitBytes ? ` of ${formatBytes(limitBytes)}` : '';
    const actionConfigSuggestedLimitBytes = getSuggestedLimitBytes(limitBytes, contentLengthBytes);
    const maxStepSizeSuggestedLimitBytes =
      getSuggestedLimitBytes(limitBytes, estimatedOutputBytes) ?? actionConfigSuggestedLimitBytes;
    const suggestedLimitBytes = canOverrideWithMaxStepSize
      ? maxStepSizeSuggestedLimitBytes
      : actionConfigSuggestedLimitBytes;
    const contentLengthMessage = contentLengthBytes
      ? ` The response advertised a content length of ${formatBytes(contentLengthBytes)}.`
      : '';
    const estimatedOutputMessage = estimatedOutputBytes
      ? ` Estimated stored step output size is ${formatBytes(estimatedOutputBytes)}.`
      : '';
    const suggestion = actionConfigSuggestedLimitBytes
      ? `Increase "${ACTIONS_MAX_RESPONSE_CONTENT_LENGTH_CONFIG}" to at least ${formatBytes(
          actionConfigSuggestedLimitBytes
        )}, or reduce the connector response size.`
      : `Increase "${ACTIONS_MAX_RESPONSE_CONTENT_LENGTH_CONFIG}" or reduce the connector response size.`;
    const maxStepSizeSuggestion = canOverrideWithMaxStepSize
      ? getMaxStepSizeSuggestion({ limitBytes, maxStepSizeSuggestedLimitBytes })
      : undefined;

    super({
      type: 'ActionsResponseContentLengthExceeded',
      message: canOverrideWithMaxStepSize
        ? `Step "${stepName}" connector response exceeded the current Actions HTTP response limit${formattedLimit} before the workflow step output was built.${contentLengthMessage}${estimatedOutputMessage} ${maxStepSizeSuggestion}`
        : `Step "${stepName}" connector response exceeded the Actions HTTP response limit${formattedLimit}. This limit is controlled by "${ACTIONS_MAX_RESPONSE_CONTENT_LENGTH_CONFIG}" and is enforced before the workflow step output is stored.${contentLengthMessage}${estimatedOutputMessage} Increasing "max-step-size" will not change this limit; ${suggestion}`,
      details: {
        configKey: ACTIONS_MAX_RESPONSE_CONTENT_LENGTH_CONFIG,
        ...(limitBytes ? { limitBytes } : {}),
        ...(contentLengthBytes ? { contentLengthBytes } : {}),
        ...(estimatedOutputBytes ? { estimatedOutputBytes } : {}),
        ...(suggestedLimitBytes ? { suggestedLimitBytes } : {}),
      },
    });
  }
}
