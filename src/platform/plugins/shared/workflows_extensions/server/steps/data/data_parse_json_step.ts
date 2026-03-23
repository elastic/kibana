/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { dataParseJsonStepCommonDefinition } from '../../../common/steps/data';
import { createServerStepDefinition } from '../../step_registry/types';

const MAX_SOURCE_LENGTH = 10 * 1024 * 1024; // 10 MB

export const dataParseJsonStepDefinition = createServerStepDefinition({
  ...dataParseJsonStepCommonDefinition,
  handler: async (context) => {
    try {
      const source = context.contextManager.renderInputTemplate(context.config.source);

      if (source === null || source === undefined) {
        return { error: new Error('Source is null or undefined') };
      }

      if (typeof source !== 'string') {
        context.logger.debug('Source is already a structured type, returning as-is');
        return { output: source };
      }

      if (source.length > MAX_SOURCE_LENGTH) {
        return {
          error: new Error(
            `Source exceeds maximum allowed size of ${MAX_SOURCE_LENGTH / 1024 / 1024} MB`
          ),
        };
      }

      const parsed = JSON.parse(source);
      context.logger.debug(`Parsed JSON successfully (type: ${typeof parsed})`);
      return { output: parsed };
    } catch (error) {
      if (error instanceof SyntaxError) {
        return { error: new Error(`Invalid JSON: ${error.message}`) };
      }
      return {
        error: new Error(error instanceof Error ? error.message : 'Failed to parse JSON'),
      };
    }
  },
});
