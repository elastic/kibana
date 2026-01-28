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
  streamsGetStreamStepCommonDefinition,
  StreamsGetStreamStepTypeId,
} from '../../../common/steps/streams';
import { ActionsMenuGroup, type PublicStepDefinition } from '../../step_registry/types';

export const streamsGetStreamStepDefinition: PublicStepDefinition = {
  ...streamsGetStreamStepCommonDefinition,
  icon: React.lazy(() =>
    import('@elastic/eui/es/components/icon/assets/document').then(({ icon }) => ({
      default: icon,
    }))
  ),
  label: i18n.translate('workflowsExtensions.streamsGetStreamStep.label', {
    defaultMessage: 'Get Stream',
  }),
  description: i18n.translate('workflowsExtensions.streamsGetStreamStep.description', {
    defaultMessage: 'Retrieve details of a specific stream by name',
  }),
  actionsMenuGroup: ActionsMenuGroup.kibana,
  documentation: {
    details: i18n.translate('workflowsExtensions.streamsGetStreamStep.documentation.details', {
      defaultMessage: `The ${StreamsGetStreamStepTypeId} step retrieves a specific stream definition including its features and associated dashboards. Use {nameSyntax} to specify the stream name. The stream data is accessible via {outputSyntax}.`,
      values: {
        nameSyntax: '`name`',
        outputSyntax: '`{{ steps.stepName.output.stream }}`',
      },
    }),
    examples: [
      `## Get a specific stream
\`\`\`yaml
- name: fetch-logs-stream
  type: ${StreamsGetStreamStepTypeId}
  with:
    name: "logs"

# Access stream properties in subsequent steps
- name: log-stream-info
  type: log
  with:
    message: "Stream name: \${{ steps.fetch-logs-stream.output.stream.name }}"
\`\`\``,

      `## Get stream from dynamic input
\`\`\`yaml
- name: get-dynamic-stream
  type: ${StreamsGetStreamStepTypeId}
  with:
    name: "\${{ inputs.streamName }}"
\`\`\``,
    ],
  },
};
