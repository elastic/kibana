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
  streamsListStreamsStepCommonDefinition,
  StreamsListStreamsStepTypeId,
} from '../../../common/steps/streams';
import { ActionsMenuGroup, type PublicStepDefinition } from '../../step_registry/types';

export const streamsListStreamsStepDefinition: PublicStepDefinition = {
  ...streamsListStreamsStepCommonDefinition,
  icon: React.lazy(() =>
    import('@elastic/eui/es/components/icon/assets/list').then(({ icon }) => ({
      default: icon,
    }))
  ),
  label: i18n.translate('workflowsExtensions.streamsListStreamsStep.label', {
    defaultMessage: 'List Streams',
  }),
  description: i18n.translate('workflowsExtensions.streamsListStreamsStep.description', {
    defaultMessage: 'Retrieve a list of all available stream definitions',
  }),
  actionsMenuGroup: ActionsMenuGroup.kibana,
  documentation: {
    details: i18n.translate('workflowsExtensions.streamsListStreamsStep.documentation.details', {
      defaultMessage: `The ${StreamsListStreamsStepTypeId} step retrieves all stream definitions from the Streams API. The output contains an array of stream definitions accessible via {outputSyntax}.`,
      values: {
        outputSyntax: '`{{ steps.stepName.output.streams }}`',
      },
    }),
    examples: [
      `## List all streams
\`\`\`yaml
- name: get-all-streams
  type: ${StreamsListStreamsStepTypeId}

# Access the streams array in subsequent steps
- name: log-stream-count
  type: log
  with:
    message: "Found \${{ steps.get-all-streams.output.streams | size }} streams"
\`\`\``,
    ],
  },
};
