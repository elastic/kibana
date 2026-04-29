/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { AttachmentServiceStartContract } from '@kbn/agent-builder-browser';
import type { CoreStart } from '@kbn/core/public';
import { createWorkflowYamlAttachmentUiDefinition } from './workflow_yaml_attachment_renderer';
import { workflowYamlDiffAttachmentUiDefinition } from './workflow_yaml_diff_attachment_renderer';
import {
  WORKFLOW_YAML_ATTACHMENT_TYPE,
  WORKFLOW_YAML_DIFF_ATTACHMENT_TYPE,
} from '../../../../common/agent_builder/constants';
import type { TelemetryServiceClient } from '../../../common/lib/telemetry/types';

export const registerWorkflowAttachmentRenderers = (
  attachments: AttachmentServiceStartContract,
  services: {
    core: CoreStart;
    telemetry: TelemetryServiceClient;
  }
): void => {
  attachments.addAttachmentType(
    WORKFLOW_YAML_ATTACHMENT_TYPE,
    createWorkflowYamlAttachmentUiDefinition(services)
  );
  attachments.addAttachmentType(
    WORKFLOW_YAML_DIFF_ATTACHMENT_TYPE,
    workflowYamlDiffAttachmentUiDefinition
  );
};
