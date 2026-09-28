/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { i18n } from '@kbn/i18n';
import type { AgentBuilderPluginStart } from '@kbn/agent-builder-browser';
import { ACTIVITY_INVESTIGATION_ATTACHMENT_TYPE } from '../../common/agent_builder';

/** Gives the frozen investigation a visible label in the chat. */
export const registerActivityInvestigationAttachmentUi = (
  agentBuilder: AgentBuilderPluginStart
): void => {
  agentBuilder.attachments.addAttachmentType(ACTIVITY_INVESTIGATION_ATTACHMENT_TYPE, {
    getLabel: () =>
      i18n.translate('discover.activityInvestigation.attachmentLabel', {
        defaultMessage: 'Activity investigation',
      }),
    getIcon: () => 'visBarVertical',
  });
};
