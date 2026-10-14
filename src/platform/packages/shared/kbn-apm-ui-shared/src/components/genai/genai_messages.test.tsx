/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { EuiThemeProvider } from '@elastic/eui';
import { GenAiMessages } from './genai_messages';
import type { GenAiMessage } from '@kbn/genai-common';
import { GENAI_EBT_CLICK_ACTIONS } from './ebt_constants';

jest.mock('@kbn/shared-ux-markdown', () => ({
  Markdown: ({ children }: { children: string }) => (
    <div data-test-subj="markdownContent">{children}</div>
  ),
}));

function renderMessages(
  inputMessages: GenAiMessage[],
  outputMessages: Array<{ role: string; content?: string }> = [],
  systemInstructions?: string
) {
  return render(
    <EuiThemeProvider>
      <GenAiMessages
        inputMessages={inputMessages}
        outputMessages={outputMessages}
        systemInstructions={systemInstructions}
      />
    </EuiThemeProvider>
  );
}

describe('GenAiMessages', () => {
  it('renders one comment per message', () => {
    renderMessages([
      { role: 'user', content: 'What is 2+2?' },
      { role: 'assistant', content: '4' },
    ]);
    expect(screen.getByTestId('genAiMessage-0')).toBeInTheDocument();
    expect(screen.getByTestId('genAiMessage-1')).toBeInTheDocument();
  });

  it('renders system instructions as first message', () => {
    renderMessages([], [], 'You are a helpful coding assistant.');
    expect(screen.getByTestId('genAiMessage-0')).toBeInTheDocument();
  });

  it('does not duplicate system instructions already present in an input system message', () => {
    const content = 'You are a helpful coding assistant.';
    renderMessages([{ role: 'system', parts: [{ type: 'text', content }] }], [], content);
    expect(screen.getAllByTestId(/genAiMessage-/)).toHaveLength(1);
  });

  it('does not duplicate system instructions already present in an input system message with content format', () => {
    const content = 'You are a helpful coding assistant.';
    renderMessages([{ role: 'system', content }], [], content);
    expect(screen.getAllByTestId(/genAiMessage-/)).toHaveLength(1);
  });

  it('adds system instructions when input system messages have different content', () => {
    renderMessages(
      [{ role: 'system', parts: [{ type: 'text', content: 'Answer in JSON.' }] }],
      [],
      'You are a helpful coding assistant.'
    );
    expect(screen.getAllByTestId(/genAiMessage-/)).toHaveLength(2);
  });

  it('renders text content via markdown for multiline/markdown content', () => {
    renderMessages([{ role: 'user', content: '# Hello\nWorld' }]);
    expect(screen.getByTestId('markdownContent')).toBeInTheDocument();
    expect(screen.getByTestId('markdownContent').textContent).toContain('# Hello');
  });

  it('renders function/tool part as a JSON code block', () => {
    renderMessages([
      {
        role: 'assistant',
        parts: [{ type: 'function', name: 'get_weather', args: { location: 'Paris' } }],
      },
    ]);
    // GenAiFieldValue detects object and renders EuiCodeBlock — look for code element
    const codeBlocks = document.querySelectorAll('code, pre, [class*="CodeBlock"]');
    expect(codeBlocks.length).toBeGreaterThan(0);
  });

  it('renders the raw role in each message header', () => {
    renderMessages([
      { role: 'user', content: 'Hi' },
      { role: 'assistant', content: 'Hello' },
    ]);
    expect(screen.getByTestId('genAiRoleLabel-user')).toHaveTextContent(/^user$/);
    expect(screen.getByTestId('genAiRoleLabel-assistant')).toHaveTextContent(/^assistant$/);
  });

  it('renders assistant tool calls as cards with the tool name, call ID and arguments', () => {
    renderMessages([
      {
        role: 'assistant',
        parts: [
          { type: 'text', content: 'Let me search' },
          { type: 'tool_call', id: 'call-1', name: 'search', arguments: '{"query":"errors"}' },
        ],
      },
    ]);
    const toolCall = screen.getByTestId('genAiToolCallPart');
    expect(toolCall).toHaveTextContent('search');
    expect(toolCall).toHaveTextContent('call-1');
    expect(toolCall).toHaveTextContent('query: errors');
    expect(screen.getByText('Let me search')).toBeInTheDocument();
  });

  it('renders a copy button on each tool call and tool result card', () => {
    renderMessages([
      {
        role: 'assistant',
        parts: [{ type: 'tool_call', id: 'call-1', name: 'search', arguments: '{}' }],
      },
      {
        role: 'user',
        parts: [{ type: 'tool_call_response', id: 'call-1', response: 'done' }],
      },
    ]);
    expect(screen.getByTestId('genAiToolCallPartCopy')).toHaveAttribute(
      'aria-label',
      'Copy tool call'
    );
    expect(screen.getByTestId('genAiToolResponsePartCopy')).toHaveAttribute(
      'aria-label',
      'Copy tool output'
    );
  });

  it('omits the arguments body for tool calls without arguments', () => {
    renderMessages([
      {
        role: 'assistant',
        parts: [{ type: 'tool_call', id: 'call-1', name: 'list_indices', arguments: '{}' }],
      },
    ]);
    expect(screen.queryByTestId('genAiStructuredValue')).toBeNull();
  });

  it('labels tool messages with the name of the tool that produced the output', () => {
    renderMessages([
      {
        role: 'assistant',
        parts: [{ type: 'tool_call', id: 'call-1', name: 'search', arguments: '{}' }],
      },
      {
        role: 'tool',
        parts: [{ type: 'tool_call_response', id: 'call-1', response: '{"hits":[]}' }],
      },
    ]);
    expect(screen.getByTestId('genAiRoleLabel-tool')).toHaveTextContent(/^tool$/);
    expect(screen.getByTestId('genAiToolOutputCopy-1')).toHaveAttribute(
      'aria-label',
      'Copy tool output'
    );
    expect(screen.queryByTestId('genAiToolOutputCopy-0')).toBeNull();
    expect(screen.getByTestId('genAiToolMessageName-1')).toHaveTextContent('search');
    expect(screen.getByTestId('genAiToolMessageCallId-1')).toHaveTextContent('call-1');
    expect(screen.getByTestId('genAiMessage-1')).toHaveTextContent('hits: []');
    expect(screen.queryByTestId('genAiToolResponsePart')).toBeNull();
  });

  it('renders legacy OpenAI-style tool calls and tool messages', () => {
    renderMessages([
      {
        role: 'assistant',
        tool_calls: [{ id: 'call-1', function: { name: 'search', arguments: '{"q":"x"}' } }],
      },
      { role: 'tool', tool_call_id: 'call-1', content: 'no results' },
    ]);
    expect(screen.getByTestId('genAiToolCallPart')).toHaveTextContent('search');
    expect(screen.getByTestId('genAiToolMessageName-1')).toHaveTextContent('search');
    expect(screen.getByTestId('genAiMessage-1')).toHaveTextContent('no results');
  });

  it('unwraps Agent Builder tool result envelopes and shows multi-line text verbatim', () => {
    const inner = JSON.stringify({
      results: [{ type: 'other', data: { text: 'line 1\nline 2' } }],
    });
    renderMessages([
      {
        role: 'tool',
        parts: [
          {
            type: 'tool_call_response',
            id: 'call-1',
            response: JSON.stringify({ response: `<tool_result>${inner}</tool_result>` }),
          },
        ],
      },
    ]);
    const message = screen.getByTestId('genAiMessage-0');
    expect(message).not.toHaveTextContent('tool_result');
    expect(message).not.toHaveTextContent('\\n');
    expect(message).toHaveTextContent('type: other');
    expect(screen.getByTestId('genAiStructuredValue').textContent).toContain(
      'text: |-\n        line 1\n        line 2'
    );
  });

  it('renders tool responses inside non-tool messages as tool result cards', () => {
    renderMessages([
      {
        role: 'assistant',
        parts: [{ type: 'tool_call', id: 'call-1', name: 'search', arguments: '{}' }],
      },
      {
        role: 'user',
        parts: [{ type: 'tool_call_response', id: 'call-1', response: 'done' }],
      },
    ]);
    const response = screen.getByTestId('genAiToolResponsePart');
    expect(response).toHaveTextContent('search');
    expect(response).toHaveTextContent('done');
  });

  it('renders output messages after input messages', () => {
    renderMessages([{ role: 'user', content: 'Hello' }], [{ role: 'assistant', content: 'Hi' }]);
    const messages = screen.getAllByTestId(/genAiMessage-/);
    expect(messages).toHaveLength(2);
  });

  it('returns null when there are no messages', () => {
    const { container } = renderMessages([], [], undefined);
    expect(container.firstChild).toBeNull();
  });

  it('shows View more toggle for very long content (> 1000 chars)', () => {
    // MaybeViewMore threshold: max(newlineLines, charLines) * 18 > 300 (MAX_HEIGHT).
    // For single-line prose: charLines = ceil(len/60), so > 1000 chars triggers.
    const longContent = 'a'.repeat(1200);
    renderMessages([{ role: 'user', content: longContent }]);
    expect(screen.getByText('View more')).toBeInTheDocument();
  });

  it('toggles to View less when View more is clicked', () => {
    const longContent = 'a'.repeat(1200);
    renderMessages([{ role: 'user', content: longContent }]);
    const toggle = screen.getByText('View more');
    fireEvent.click(toggle);
    expect(screen.getByText('View less')).toBeInTheDocument();
  });

  it('renders the View more toggle with the apmViewMoreLink data-test-subj', () => {
    renderMessages([{ role: 'user', content: 'a'.repeat(1200) }]);
    expect(screen.getByTestId('apmViewMoreLink')).toBeInTheDocument();
    expect(screen.getByTestId('apmViewMoreLink')).toHaveTextContent('View more');
  });
});

describe('GenAiMessages — copy buttons', () => {
  it('renders a copy button for each message', () => {
    renderMessages(
      [{ role: 'user', content: 'Hello' }],
      [{ role: 'assistant', content: 'Hi there' }]
    );
    expect(screen.getByTestId('genAiMessageCopy-0')).toBeInTheDocument();
    expect(screen.getByTestId('genAiMessageCopy-1')).toBeInTheDocument();
  });

  it('does not render copy buttons when there are no messages', () => {
    const { container } = renderMessages([], [], undefined);
    expect(container.firstChild).toBeNull();
    expect(screen.queryByTestId('genAiMessageCopy-0')).toBeNull();
  });

  it('adds data-ebt-* attributes to copy buttons when the ebt prop is passed', () => {
    render(
      <EuiThemeProvider>
        <GenAiMessages
          inputMessages={[{ role: 'user', content: 'Hello' }]}
          outputMessages={[]}
          ebt={{ element: 'docViewerGenAiTab' }}
        />
      </EuiThemeProvider>
    );
    const copyBtn = screen.getByTestId('genAiMessageCopy-0');
    expect(copyBtn).toHaveAttribute('data-ebt-action', GENAI_EBT_CLICK_ACTIONS.COPY_MESSAGE);
    expect(copyBtn).toHaveAttribute('data-ebt-element', 'docViewerGenAiTab');
    expect(copyBtn).toHaveAttribute('data-ebt-detail', 'user');
  });

  it('omits data-ebt-* attributes when the ebt prop is absent', () => {
    renderMessages([{ role: 'user', content: 'Hello' }]);
    const copyBtn = screen.getByTestId('genAiMessageCopy-0');
    expect(copyBtn).not.toHaveAttribute('data-ebt-action');
    expect(copyBtn).not.toHaveAttribute('data-ebt-element');
  });

  it('sets data-highlighted on mouseEnter and clears it on mouseLeave', () => {
    renderMessages([
      { role: 'user', content: 'First message' },
      { role: 'assistant', content: 'Second message' },
    ]);

    const copyBtn0 = screen.getByTestId('genAiMessageCopy-0');
    const comment0 = screen.getByTestId('genAiMessage-0');
    const comment1 = screen.getByTestId('genAiMessage-1');

    // Before hover: neither comment is highlighted
    expect(comment0).not.toHaveAttribute('data-highlighted', 'true');
    expect(comment1).not.toHaveAttribute('data-highlighted', 'true');

    // Hover the first message's copy button
    fireEvent.mouseEnter(copyBtn0);
    expect(comment0).toHaveAttribute('data-highlighted', 'true');
    expect(comment1).not.toHaveAttribute('data-highlighted', 'true');

    // Leave the button
    fireEvent.mouseLeave(copyBtn0);
    expect(comment0).not.toHaveAttribute('data-highlighted', 'true');
  });
});
