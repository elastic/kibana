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
  streamsListFeaturesStepCommonDefinition,
  StreamsListFeaturesStepTypeId,
} from '../../../common/steps/streams';
import { ActionsMenuGroup, type PublicStepDefinition } from '../../step_registry/types';

export const streamsListFeaturesStepDefinition: PublicStepDefinition = {
  ...streamsListFeaturesStepCommonDefinition,
  icon: React.lazy(() =>
    import('@elastic/eui/es/components/icon/assets/list').then(({ icon }) => ({
      default: icon,
    }))
  ),
  label: i18n.translate('workflowsExtensions.streamsListFeaturesStep.label', {
    defaultMessage: 'List Features',
  }),
  description: i18n.translate('workflowsExtensions.streamsListFeaturesStep.description', {
    defaultMessage: 'List all features for a specific stream',
  }),
  actionsMenuGroup: ActionsMenuGroup.kibana,
  documentation: {
    details: i18n.translate('workflowsExtensions.streamsListFeaturesStep.documentation.details', {
      defaultMessage: `The ${StreamsListFeaturesStepTypeId} step retrieves all features associated with a stream. Use {nameSyntax} to specify the stream name and optionally {typeSyntax} to filter by feature type. The features are accessible via {outputSyntax}.`,
      values: {
        nameSyntax: '`name`',
        typeSyntax: '`type`',
        outputSyntax: '`{{ steps.stepName.output.features }}`',
      },
    }),
    examples: [
      `## List all features for a stream
\`\`\`yaml
- name: get-features
  type: ${StreamsListFeaturesStepTypeId}
  with:
    name: "logs"

# Access features in subsequent steps
- name: log-features
  type: log
  with:
    message: "Found \${{ steps.get-features.output.features | size }} features"
\`\`\``,

      `## List features filtered by type
\`\`\`yaml
- name: get-filtered-features
  type: ${StreamsListFeaturesStepTypeId}
  with:
    name: "logs"
    type: "pattern"
\`\`\``,

      `## List features from dynamic input
\`\`\`yaml
- name: get-stream-features
  type: ${StreamsListFeaturesStepTypeId}
  with:
    name: "\${{ inputs.streamName }}"
\`\`\``,
    ],
  },
};
