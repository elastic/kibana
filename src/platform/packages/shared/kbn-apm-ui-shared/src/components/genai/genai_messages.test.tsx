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
import { GENAI_EBT_CLICK_ACTIONS } from './ebt_constants';

jest.mock('@kbn/shared-ux-markdown', () => ({
  Markdown: ({ children }: { children: string }) => (
    <div data-test-subj="markdownContent">{children}</div>
  ),
}));

function renderMessages(
  inputMessages: Array<{
    role: string;
    content?: string;
    parts?: Array<{ type: string; content?: string; [key: string]: unknown }>;
  }>,
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
