/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiIcon,
  EuiPanel,
  EuiSpacer,
  EuiText,
  useEuiTheme,
} from '@elastic/eui';
import { css } from '@emotion/react';
import { i18n } from '@kbn/i18n';
import React from 'react';
import type { GenAiMessage } from './get_genai_fields';
import type { GenAiMessageBlock } from './get_message_blocks';
import { getMessageBlocks } from './get_message_blocks';
import { GenAiFieldValue } from './genai_field_value';
import { GenAiStructuredValue } from './genai_structured_value';

interface ToolCardProps {
  iconType: string;
  name?: string;
  id?: string;
  children?: React.ReactNode;
  'data-test-subj'?: string;
}

/** Bordered card for a single tool invocation or result, headed by the tool name and call ID. */
export function GenAiToolCard({
  iconType,
  name,
  id,
  children,
  'data-test-subj': dataTestSubj,
}: ToolCardProps) {
  const { euiTheme } = useEuiTheme();
  const codeFontCss = css`
    font-family: ${euiTheme.font.familyCode};
  `;

  return (
    <EuiPanel hasBorder hasShadow={false} paddingSize="none" data-test-subj={dataTestSubj}>
      <EuiFlexGroup
        gutterSize="s"
        alignItems="center"
        responsive={false}
        css={css`
          padding: ${euiTheme.size.xs} ${euiTheme.size.s};
          background-color: ${euiTheme.colors.backgroundBaseSubdued};
          border-bottom: ${children != null ? euiTheme.border.thin : 'none'};
          border-radius: ${euiTheme.border.radius.medium} ${euiTheme.border.radius.medium} 0 0;
        `}
      >
        <EuiFlexItem grow={false}>
          <EuiIcon type={iconType} size="s" color="subdued" aria-hidden={true} />
        </EuiFlexItem>
        <EuiFlexItem grow={false} css={{ minWidth: 0 }}>
          <EuiText size="xs" css={[codeFontCss, { overflowWrap: 'anywhere' }]}>
            <strong>
              {name ??
                i18n.translate('apmUiShared.genAi.messages.unknownTool', {
                  defaultMessage: 'Unknown tool',
                })}
            </strong>
          </EuiText>
        </EuiFlexItem>
        {id && (
          <EuiFlexItem css={{ minWidth: 0, alignItems: 'flex-end' }}>
            <EuiText
              size="xs"
              color="subdued"
              css={[codeFontCss, { overflowWrap: 'anywhere', textAlign: 'right' }]}
            >
              {id}
            </EuiText>
          </EuiFlexItem>
        )}
      </EuiFlexGroup>
      {children != null && (
        <div
          css={css`
            padding: ${euiTheme.size.s};
          `}
        >
          {children}
        </div>
      )}
    </EuiPanel>
  );
}

/** Treats missing, blank and empty-object tool call arguments as absent. */
const hasArguments = (args: unknown): boolean => {
  if (args == null) return false;
  if (typeof args === 'string') return args.trim() !== '';
  return typeof args !== 'object' || Object.keys(args).length > 0;
};

/** Renders tool arguments or output: structured data as a tree, text as text. */
export function GenAiToolValue({ value }: { value: unknown }) {
  if (value != null && typeof value === 'object') return <GenAiStructuredValue value={value} />;
  return <GenAiFieldValue value={value ?? ''} />;
}

interface BlockProps {
  block: GenAiMessageBlock;
  role: string;
  toolNamesById: Map<string, string>;
}

function GenAiMessageBlockContent({ block, role, toolNamesById }: BlockProps) {
  switch (block.type) {
    case 'text':
      return <GenAiFieldValue value={block.content} />;
    case 'tool_call':
      return (
        <GenAiToolCard
          iconType="wrench"
          name={block.name}
          id={block.id}
          data-test-subj="genAiToolCallPart"
        >
          {hasArguments(block.arguments) ? <GenAiToolValue value={block.arguments} /> : undefined}
        </GenAiToolCard>
      );
    case 'tool_call_response':
      // In a tool message the header already names the tool, so render the output directly.
      if (role === 'tool') return <GenAiToolValue value={block.response} />;
      return (
        <GenAiToolCard
          iconType="returnKey"
          name={block.id ? toolNamesById.get(block.id) : undefined}
          id={block.id}
          data-test-subj="genAiToolResponsePart"
        >
          <GenAiToolValue value={block.response} />
        </GenAiToolCard>
      );
    default:
      return <GenAiFieldValue value={block.value} />;
  }
}

interface Props {
  message: GenAiMessage;
  toolNamesById?: Map<string, string>;
}

const EMPTY_TOOL_NAMES = new Map<string, string>();

export function GenAiMessageContent({ message, toolNamesById = EMPTY_TOOL_NAMES }: Props) {
  const blocks = getMessageBlocks(message);

  return (
    <>
      {blocks.map((block, i) => (
        <React.Fragment key={i}>
          {i > 0 && <EuiSpacer size="s" />}
          <GenAiMessageBlockContent
            block={block}
            role={message.role}
            toolNamesById={toolNamesById}
          />
        </React.Fragment>
      ))}
    </>
  );
}
