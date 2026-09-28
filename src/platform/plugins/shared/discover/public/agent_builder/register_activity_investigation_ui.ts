/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { i18n } from '@kbn/i18n';
import { ActionButtonType, type AgentBuilderPluginStart } from '@kbn/agent-builder-browser';
import {
  ACTIVITY_INVESTIGATION_AGENT_ID,
  ACTIVITY_INVESTIGATION_ATTACHMENT_TYPE,
} from '../../common/agent_builder';

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
    getActionButtons: ({ attachment, agentId, isCanvas, sendMessage }) => {
      if (isCanvas || agentId !== ACTIVITY_INVESTIGATION_AGENT_ID) return [];
      return [
        {
          label: i18n.translate('discover.activityInvestigation.investigateMoreButtonLabel', {
            defaultMessage: 'Investigate more',
          }),
          icon: 'inspect',
          type: ActionButtonType.PRIMARY,
          disabled: !sendMessage,
          handler: () => {
            sendMessage?.(
              i18n.translate('discover.activityInvestigation.investigateMoreDescription', {
                defaultMessage:
                  'Investigate more for activity snapshot {attachmentId}. Inspect a small sample of query-result rows for the measured contributor in the original increase and comparison windows. Keep the same query, filters and metric. Look for evidence explaining the increase, distinguish evidence from hypotheses, and say if the cause remains unknown.',
                values: { attachmentId: attachment.id },
              })
            );
          },
        },
      ];
    },
  });
};
