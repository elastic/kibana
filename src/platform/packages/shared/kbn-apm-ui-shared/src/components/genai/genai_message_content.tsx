/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { EuiSpacer, EuiText } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import React from 'react';
import type { GenAiMessage } from '@kbn/genai-common';
import type { GenAiMessageBlock } from './get_message_blocks';
import { getMessageBlocks } from './get_message_blocks';
import { GenAiFieldValue } from './genai_field_value';
import { GenAiToolCard } from './genai_tool_card';
import { GenAiToolValue } from './genai_tool_value';

/** Treats missing, blank and empty-object tool call arguments as absent. */
const hasArguments = (args: unknown): boolean => {
  if (args == null) return false;
  if (typeof args === 'string') return args.trim() !== '';
  return typeof args !== 'object' || Object.keys(args).length > 0;
};

const toCopyJson = (value: Record<string, unknown>): string => JSON.stringify(value, null, 2);

const COPY_TOOL_CALL_LABEL = i18n.translate('apmUiShared.genAi.messages.copyToolCall', {
  defaultMessage: 'Copy tool call',
});

const COPY_TOOL_OUTPUT_LABEL = i18n.translate('apmUiShared.genAi.messages.copyToolOutput', {
  defaultMessage: 'Copy tool output',
});

interface BlockProps {
  block: GenAiMessageBlock;
  role: string;
  toolNamesById: Map<string, string>;
}

function GenAiMessageBlockContent({ block, role, toolNamesById }: BlockProps) {
  switch (block.type) {
    case 'text':
      // Only prose goes in EuiText: its typography margins would pad code blocks.
      return (
        <EuiText size="s">
          <GenAiFieldValue value={block.content} />
        </EuiText>
      );
    case 'tool_call':
      return (
        <GenAiToolCard
          iconType="wrench"
          name={block.name}
          id={block.id}
          copyText={toCopyJson({ id: block.id, name: block.name, arguments: block.arguments })}
          copyLabel={COPY_TOOL_CALL_LABEL}
          data-test-subj="genAiToolCallPart"
        >
          {hasArguments(block.arguments) ? <GenAiToolValue value={block.arguments} /> : undefined}
        </GenAiToolCard>
      );
    case 'tool_call_response': {
      // In a tool message the header already names the tool, so render the output directly.
      if (role === 'tool') return <GenAiToolValue value={block.response} />;
      const name = block.id ? toolNamesById.get(block.id) : undefined;
      return (
        <GenAiToolCard
          iconType="returnKey"
          name={name}
          id={block.id}
          copyText={toCopyJson({ id: block.id, name, response: block.response })}
          copyLabel={COPY_TOOL_OUTPUT_LABEL}
          data-test-subj="genAiToolResponsePart"
        >
          <GenAiToolValue value={block.response} />
        </GenAiToolCard>
      );
    }
    default:
      return (
        <EuiText size="s">
          <GenAiFieldValue value={block.value} />
        </EuiText>
      );
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
