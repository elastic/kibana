/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { i18n } from '@kbn/i18n';
import {
  streamsGetSignificantEventsStepCommonDefinition,
  StreamsGetSignificantEventsStepTypeId,
} from '../../../common/steps/streams';
import { ActionsMenuGroup, type PublicStepDefinition } from '../../step_registry/types';

export const streamsGetSignificantEventsStepDefinition: PublicStepDefinition = {
  ...streamsGetSignificantEventsStepCommonDefinition,
  icon: React.lazy(() =>
    import('@elastic/eui/es/components/icon/assets/bell').then(({ icon }) => ({
      default: icon,
    }))
  ),
  label: i18n.translate('workflowsExtensions.streamsGetSignificantEventsStep.label', {
    defaultMessage: 'Get Significant Events',
  }),
  description: i18n.translate('workflowsExtensions.streamsGetSignificantEventsStep.description', {
    defaultMessage: 'Retrieve significant events for a stream within a time range',
  }),
  actionsMenuGroup: ActionsMenuGroup.kibana,
  documentation: {
    details: i18n.translate(
      'workflowsExtensions.streamsGetSignificantEventsStep.documentation.details',
      {
        defaultMessage: `The ${StreamsGetSignificantEventsStepTypeId} step retrieves significant events for a stream. Specify the stream {nameSyntax}, time range with {fromSyntax} and {toSyntax} (ISO 8601 format), and {bucketSizeSyntax} for aggregation. Optionally filter with {querySyntax}. Results are accessible via {outputSyntax}.`,
        values: {
          nameSyntax: '`name`',
          fromSyntax: '`from`',
          toSyntax: '`to`',
          bucketSizeSyntax: '`bucketSize`',
          querySyntax: '`query`',
          outputSyntax: '`{{ steps.stepName.output }}`',
        },
      }
    ),
    examples: [
      `## Get significant events for the last 24 hours
\`\`\`yaml
- name: get-events
  type: ${StreamsGetSignificantEventsStepTypeId}
  with:
    name: "logs"
    from: "\${{ now | date: '%Y-%m-%dT%H:%M:%SZ', offset: '-24h' }}"
    to: "\${{ now | date: '%Y-%m-%dT%H:%M:%SZ' }}"
    bucketSize: "1h"

# Access significant events in subsequent steps
- name: log-events
  type: log
  with:
    message: "Found \${{ steps.get-events.output.significant_events | size }} significant events"
\`\`\``,

      `## Get significant events with a filter query
\`\`\`yaml
- name: get-filtered-events
  type: ${StreamsGetSignificantEventsStepTypeId}
  with:
    name: "logs"
    from: "2024-01-01T00:00:00Z"
    to: "2024-01-02T00:00:00Z"
    bucketSize: "1h"
    query: "severity:error"
\`\`\``,
    ],
  },
};
