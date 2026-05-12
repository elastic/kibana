/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { i18n } from '@kbn/i18n';
import type { PublicTriggerDefinition } from '@kbn/workflows-extensions/public';
import React from 'react';
import { commonLoopTriggerDefinition } from '../../common/triggers/loop_trigger';

export const loopTriggerPublicDefinition: PublicTriggerDefinition = {
  ...commonLoopTriggerDefinition,
  title: i18n.translate('workflowsExtensionsExample.loopTrigger.title', {
    defaultMessage: 'Loop trigger',
  }),
  description: i18n.translate('workflowsExtensionsExample.loopTrigger.description', {
    defaultMessage:
      'Emitted for the event-chain depth demo. Start or re-emit via POST to /api/workflows_extensions_example/emit_loop.',
  }),
  icon: React.lazy(() =>
    import('@elastic/eui/es/components/icon/assets/refresh').then(({ icon }) => ({ default: icon }))
  ),
  documentation: {
    details: i18n.translate('workflowsExtensionsExample.loopTrigger.documentation.details', {
      defaultMessage:
        'Used to demonstrate the event-chain depth guardrail (workflowsExecutionEngine.eventDriven.maxChainDepth, default 10). Emit via the emit_loop endpoint; a workflow should use a kibana.request step to POST back to that endpoint with the next iteration so chain depth headers propagate until the guardrail stops scheduling.',
    }),
    examples: [
      i18n.translate('workflowsExtensionsExample.loopTrigger.documentation.exampleStart', {
        defaultMessage: `## Start the loop
\`\`\`bash
curl -X POST -u elastic:changeme -H 'Content-Type: application/json' \\
  'http://localhost:5601/api/workflows_extensions_example/emit_loop' \\
  -d '{}'
\`\`\`
(iteration defaults to 0.)`,
      }),
    ],
  },
  snippets: {
    condition: '',
  },
};
