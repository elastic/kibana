/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import {
  EuiAvatar,
  EuiButtonIcon,
  EuiComment,
  EuiCommentList,
  EuiCopy,
  EuiText,
  EuiToolTip,
  useEuiTheme,
} from '@elastic/eui';
import { css } from '@emotion/react';
import { getEbtProps, type EbtClickAttrsElementOnly } from '@kbn/ebt-click';
import { i18n } from '@kbn/i18n';
import React, { useState } from 'react';
import type { GenAiMessage } from './get_genai_fields';
import { getMessageCopyText } from './get_genai_fields';
import { GenAiMessageContent } from './genai_message_content';
import { GENAI_EBT_CLICK_ACTIONS } from './ebt_constants';

/**
 * Fixed-size role avatar using EUI semantic background tokens so the circle
 * is always the same size regardless of the role label length — keeping all
 * message bodies aligned in a consistent column.
 */
function RoleAvatar({ role }: { role: string }) {
  const { euiTheme } = useEuiTheme();

  // Semantic "light" background tokens — soft pastels that work in both
  // light and dark mode and match EUI's own status-color system.
  const colorByRole: Record<string, string> = {
    system: euiTheme.colors.backgroundLightWarning,
    user: euiTheme.colors.backgroundLightPrimary,
    assistant: euiTheme.colors.backgroundLightSuccess,
    tool: euiTheme.colors.backgroundLightAccent,
    function: euiTheme.colors.backgroundLightAccent,
  };
  const color = colorByRole[role.toLowerCase()] ?? euiTheme.colors.backgroundBaseSubdued;

  return <EuiAvatar name={role} color={color} size="m" data-test-subj={`genAiRoleBadge-${role}`} />;
}

interface Props {
  inputMessages: GenAiMessage[];
  outputMessages: GenAiMessage[];
  systemInstructions?: string;
  /** When provided, copy-button clicks are tracked via `data-ebt-*` attributes. */
  ebt?: EbtClickAttrsElementOnly;
}

// Base style applied to every comment: smooth background transition, plus
// overflow handling so messages always fit their container's width.
const messageCss = css`
  /* The event column is a flex child: with the default min-width: auto it
     cannot shrink below the intrinsic width of its widest content (a long
     unbroken code line, URL, etc.), pushing the copy button and part of the
     message outside the container — which offers no horizontal scrolling.
     Let it shrink so long content wraps vertically instead. */
  .euiTimelineItemEvent {
    min-width: 0;
  }

  .euiCommentEvent__body {
    transition: background-color 150ms ease;
    overflow-wrap: anywhere;
  }

  /* Wrap long code lines instead of overflowing horizontally. */
  .euiCommentEvent__body pre,
  .euiCommentEvent__body code {
    white-space: pre-wrap;
    overflow-wrap: anywhere;
  }
`;

export function GenAiMessages({ inputMessages, outputMessages, systemInstructions, ebt }: Props) {
  const { euiTheme } = useEuiTheme();
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  // Highlighted style applied when the copy button for that message is hovered.
  const highlightedCss = css`
    .euiCommentEvent__body {
      background-color: ${euiTheme.colors.backgroundBaseSubdued};
    }
  `;

  const allMessages: GenAiMessage[] = [
    ...(systemInstructions ? [{ role: 'system', content: systemInstructions }] : []),
    ...inputMessages,
    ...outputMessages,
  ];

  if (allMessages.length === 0) return null;

  return (
    <EuiCommentList
      aria-label={i18n.translate('apmUiShared.genAi.messages.conversationAriaLabel', {
        defaultMessage: 'GenAI conversation',
      })}
    >
      {allMessages.map((msg, i) => (
        <EuiComment
          key={`${msg.role}-${i}`}
          username={msg.role}
          timelineAvatar={<RoleAvatar role={msg.role} />}
          timelineAvatarAriaLabel={msg.role}
          data-test-subj={`genAiMessage-${i}`}
          data-highlighted={hoveredIndex === i}
          css={[messageCss, hoveredIndex === i && highlightedCss]}
          actions={
            <EuiCopy textToCopy={getMessageCopyText(msg)}>
              {(copy) => (
                <EuiToolTip
                  content={i18n.translate('apmUiShared.genAi.messages.copyMessage', {
                    defaultMessage: 'Copy message',
                  })}
                >
                  <EuiButtonIcon
                    iconType="copyClipboard"
                    color="text"
                    data-test-subj={`genAiMessageCopy-${i}`}
                    {...(ebt
                      ? getEbtProps({
                          action: GENAI_EBT_CLICK_ACTIONS.COPY_MESSAGE,
                          element: ebt.element,
                          detail: msg.role,
                        })
                      : {})}
                    aria-label={i18n.translate('apmUiShared.genAi.messages.copyMessageAriaLabel', {
                      defaultMessage: 'Copy {role} message',
                      values: { role: msg.role },
                    })}
                    onClick={copy}
                    onMouseEnter={() => setHoveredIndex(i)}
                    onMouseLeave={() => setHoveredIndex(null)}
                  />
                </EuiToolTip>
              )}
            </EuiCopy>
          }
        >
          <EuiText size="s">
            <GenAiMessageContent message={msg} />
          </EuiText>
        </EuiComment>
      ))}
    </EuiCommentList>
  );
}
