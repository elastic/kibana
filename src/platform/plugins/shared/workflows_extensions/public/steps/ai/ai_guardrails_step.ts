/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { AiGuardrailsStepCommonDefinition } from '../../../common/steps/ai';
import { createPublicStepDefinition } from '../../step_registry/types';

export const AiGuardrailsStepDefinition = createPublicStepDefinition({
  ...AiGuardrailsStepCommonDefinition,
  icon: React.lazy(() =>
    import('@elastic/eui/es/components/icon/assets/app_security').then(({ icon }) => ({
      default: icon,
    }))
  ),
  editorHandlers: {
    config: {
      'connector-id': {
        connectorIdSelection: {
          connectorTypes: ['inference.unified_completion', 'bedrock', 'gen-ai', 'gemini'],
          enableCreation: false,
        },
      },
    },
  },
});
