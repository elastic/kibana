/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import {
  EuiButtonIcon,
  EuiCopy,
  EuiFlexGroup,
  EuiFlexItem,
  EuiIcon,
  EuiPanel,
  EuiText,
  EuiToolTip,
  useEuiTheme,
} from '@elastic/eui';
import { css } from '@emotion/react';
import { getEbtProps, type EbtClickAttrsElementOnly } from '@kbn/ebt-click';
import { i18n } from '@kbn/i18n';
import React, { useState } from 'react';
import type { GenAiMessage } from './get_genai_fields';
import { getMessageCopyText, getTextPartsContent } from './get_genai_fields';
import { getMessageBlocks, getToolNamesById } from './get_message_blocks';
import { GenAiMessageContent } from './genai_message_content';
import { GENAI_EBT_CLICK_ACTIONS } from './ebt_constants';

interface RoleDisplay {
  label: string;
  iconType: string;
}

const ROLE_DISPLAY: Record<string, RoleDisplay> = {
  system: {
    label: i18n.translate('apmUiShared.genAi.messages.role.system', { defaultMessage: 'System' }),
    iconType: 'gear',
  },
  user: {
    label: i18n.translate('apmUiShared.genAi.messages.role.user', { defaultMessage: 'User' }),
    iconType: 'user',
  },
  assistant: {
    label: i18n.translate('apmUiShared.genAi.messages.role.assistant', {
      defaultMessage: 'Assistant',
    }),
    iconType: 'sparkles',
  },
  tool: {
    label: i18n.translate('apmUiShared.genAi.messages.role.tool', { defaultMessage: 'Tool' }),
    iconType: 'wrench',
  },
  function: {
    label: i18n.translate('apmUiShared.genAi.messages.role.function', {
      defaultMessage: 'Function',
    }),
    iconType: 'wrench',
  },
};

const getRoleDisplay = (role: string): RoleDisplay =>
  ROLE_DISPLAY[role.toLowerCase()] ?? { label: role, iconType: 'dot' };

interface ToolMessageInfo {
  names: string[];
  callIds: string[];
}

/**
 * Tool names and call IDs of the results a tool message carries, so the
 * header pairs each result with the tool call card that requested it.
 */
const getToolMessageInfo = (
  message: GenAiMessage,
  toolNamesById: Map<string, string>
): ToolMessageInfo => {
  if (message.role !== 'tool') return { names: [], callIds: [] };
  const legacyName = typeof message.name === 'string' ? message.name : undefined;
  const responses = getMessageBlocks(message).filter(
    (block) => block.type === 'tool_call_response'
  );
  const names = responses.flatMap(({ id }) => {
    const name = (id && toolNamesById.get(id)) || legacyName;
    return name ? [name] : [];
  });
  const callIds = responses.flatMap(({ id }) => (id ? [id] : []));
  return { names: [...new Set(names)], callIds: [...new Set(callIds)] };
};

interface Props {
  inputMessages: GenAiMessage[];
  outputMessages: GenAiMessage[];
  systemInstructions?: string;
  /** When provided, copy-button clicks are tracked via `data-ebt-*` attributes. */
  ebt?: EbtClickAttrsElementOnly;
}

const listCss = css`
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
`;

// Long unbroken content (code lines, URLs) must wrap rather than overflow the
// flyout, which offers no horizontal scrolling.
const bodyCss = css`
  min-width: 0;
  overflow-wrap: anywhere;

  pre,
  code {
    white-space: pre-wrap;
    overflow-wrap: anywhere;
  }
`;

export function GenAiMessages({ inputMessages, outputMessages, systemInstructions, ebt }: Props) {
  const { euiTheme } = useEuiTheme();
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  // Avoid duplicates when instrumentation sends both system instructions and
  // a system message.
  const hasSystemInstructions = inputMessages.some(({ role, content, parts }) => {
    if (role !== 'system') return false;

    return content === systemInstructions || getTextPartsContent(parts) === systemInstructions;
  });

  const allMessages: GenAiMessage[] = [
    ...(systemInstructions && !hasSystemInstructions
      ? [{ role: 'system', content: systemInstructions }]
      : []),
    ...inputMessages,
    ...outputMessages,
  ];
  const toolNamesById = getToolNamesById(allMessages);

  if (allMessages.length === 0) return null;

  return (
    <ol
      css={[listCss, { gap: euiTheme.size.s }]}
      aria-label={i18n.translate('apmUiShared.genAi.messages.conversationAriaLabel', {
        defaultMessage: 'GenAI conversation',
      })}
    >
      {allMessages.map((msg, i) => {
        const { label, iconType } = getRoleDisplay(msg.role);
        const toolMessageInfo = getToolMessageInfo(msg, toolNamesById);
        const isHighlighted = hoveredIndex === i;

        return (
          <li key={`${msg.role}-${i}`}>
            <EuiPanel
              hasBorder
              hasShadow={false}
              paddingSize="none"
              data-test-subj={`genAiMessage-${i}`}
              data-highlighted={isHighlighted}
              css={css`
                transition: background-color 150ms ease;
                ${isHighlighted
                  ? `background-color: ${euiTheme.colors.backgroundBaseSubdued};`
                  : ''}
              `}
            >
              <EuiFlexGroup
                gutterSize="s"
                alignItems="center"
                responsive={false}
                css={css`
                  padding: ${euiTheme.size.xs} ${euiTheme.size.xs} 0 ${euiTheme.size.s};
                `}
              >
                <EuiFlexItem grow={false}>
                  <EuiIcon type={iconType} size="s" color="subdued" aria-hidden={true} />
                </EuiFlexItem>
                <EuiFlexItem grow={false}>
                  <EuiText size="xs" data-test-subj={`genAiRoleBadge-${msg.role}`}>
                    <strong>{label}</strong>
                  </EuiText>
                </EuiFlexItem>
                {toolMessageInfo.names.length > 0 && (
                  <EuiFlexItem grow={false} css={{ minWidth: 0 }}>
                    <EuiText
                      size="xs"
                      color="subdued"
                      data-test-subj={`genAiToolMessageName-${i}`}
                      css={css`
                        font-family: ${euiTheme.font.familyCode};
                        overflow-wrap: anywhere;
                      `}
                    >
                      {toolMessageInfo.names.join(', ')}
                    </EuiText>
                  </EuiFlexItem>
                )}
                <EuiFlexItem />
                {toolMessageInfo.callIds.length > 0 && (
                  <EuiFlexItem grow={false} css={{ minWidth: 0 }}>
                    <EuiText
                      size="xs"
                      color="subdued"
                      data-test-subj={`genAiToolMessageCallId-${i}`}
                      css={css`
                        font-family: ${euiTheme.font.familyCode};
                        overflow-wrap: anywhere;
                        text-align: right;
                      `}
                    >
                      {toolMessageInfo.callIds.join(', ')}
                    </EuiText>
                  </EuiFlexItem>
                )}
                <EuiFlexItem grow={false}>
                  <EuiCopy textToCopy={getMessageCopyText(msg)}>
                    {(copy) => (
                      <EuiToolTip
                        content={i18n.translate('apmUiShared.genAi.messages.copyMessage', {
                          defaultMessage: 'Copy message',
                        })}
                      >
                        <EuiButtonIcon
                          iconType="copy"
                          color="text"
                          size="xs"
                          data-test-subj={`genAiMessageCopy-${i}`}
                          {...(ebt
                            ? getEbtProps({
                                action: GENAI_EBT_CLICK_ACTIONS.COPY_MESSAGE,
                                element: ebt.element,
                                detail: msg.role,
                              })
                            : {})}
                          aria-label={i18n.translate(
                            'apmUiShared.genAi.messages.copyMessageAriaLabel',
                            {
                              defaultMessage: 'Copy {role} message',
                              values: { role: msg.role },
                            }
                          )}
                          onClick={copy}
                          onMouseEnter={() => setHoveredIndex(i)}
                          onMouseLeave={() => setHoveredIndex(null)}
                        />
                      </EuiToolTip>
                    )}
                  </EuiCopy>
                </EuiFlexItem>
              </EuiFlexGroup>
              <div
                css={[
                  bodyCss,
                  css`
                    padding: ${euiTheme.size.xs} ${euiTheme.size.s} ${euiTheme.size.s};
                  `,
                ]}
              >
                <EuiText size="s">
                  <GenAiMessageContent message={msg} toolNamesById={toolNamesById} />
                </EuiText>
              </div>
            </EuiPanel>
          </li>
        );
      })}
    </ol>
  );
}
