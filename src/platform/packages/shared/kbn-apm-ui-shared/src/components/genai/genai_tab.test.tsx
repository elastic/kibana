/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { EuiThemeProvider } from '@elastic/eui';
import { GenAiTab } from './genai_tab';
import type { GenAiFields } from './get_genai_fields';

jest.mock('@kbn/shared-ux-markdown', () => ({
  Markdown: ({ children }: { children: string }) => <div data-testid="markdown">{children}</div>,
}));

const baseFields: GenAiFields = {
  operationName: 'chat',
  requestModel: 'gpt-4o',
  provider: 'openai',
  inputTokens: 120,
  outputTokens: 45,
  requestParams: {},
  response: {},
  inputMessages: [],
  outputMessages: [],
};

function renderTab(fields: Partial<GenAiFields> = {}) {
  return render(
    <EuiThemeProvider>
      <GenAiTab genAi={{ ...baseFields, ...fields }} />
    </EuiThemeProvider>
  );
}

describe('GenAiTab', () => {
  it('renders operation, model, provider, and token counts as table rows', () => {
    renderTab();
    const table = screen.getByTestId('genAiDetails');
    expect(table).toHaveTextContent('Operation');
    expect(table).toHaveTextContent('chat');
    expect(table).toHaveTextContent('Request model');
    expect(table).toHaveTextContent('gpt-4o');
    expect(table).toHaveTextContent('Provider');
    expect(table).toHaveTextContent('openai');
    expect(table).toHaveTextContent('Input tokens');
    expect(table).toHaveTextContent('120');
    expect(table).toHaveTextContent('Output tokens');
    expect(table).toHaveTextContent('45');
  });

  it('formats token counts like the waterfall badges (thousands separator)', () => {
    renderTab({ inputTokens: 960, outputTokens: 1438 });
    const table = screen.getByTestId('genAiDetails');
    expect(table).toHaveTextContent('960');
    expect(table).toHaveTextContent('1,438');
  });

  it('renders detailsSlot in place of the built-in field table', () => {
    render(
      <EuiThemeProvider>
        <GenAiTab
          genAi={{ ...baseFields, responseModel: 'gpt-4o-2024-08-06' }}
          detailsSlot={<div data-test-subj="customDetailsSlot">Custom details</div>}
        />
      </EuiThemeProvider>
    );
    expect(screen.getByTestId('customDetailsSlot')).toBeInTheDocument();
    expect(screen.queryByTestId('genAiDetails')).toBeNull();
  });

  it('renders a detailsSlot even without built-in field rows', () => {
    render(
      <EuiThemeProvider>
        <GenAiTab
          genAi={baseFields}
          detailsSlot={<div data-test-subj="customDetailsSlot">Custom details</div>}
        />
      </EuiThemeProvider>
    );
    expect(screen.getByTestId('customDetailsSlot')).toBeInTheDocument();
  });

  it('hides rows for absent values', () => {
    renderTab({ operationName: undefined, provider: undefined, inputTokens: undefined });
    const table = screen.getByTestId('genAiDetails');
    expect(table).not.toHaveTextContent('Operation');
    expect(table).not.toHaveTextContent('Provider');
    expect(table).not.toHaveTextContent('Input tokens');
    // the model row should still be present
    expect(table).toHaveTextContent('Request model');
  });

  it('renders conversation section when messages are present', () => {
    const inputMessages = [{ role: 'user', content: 'Hello' }];
    const outputMessages = [{ role: 'assistant', content: 'Hi there' }];
    renderTab({ inputMessages, outputMessages });
    expect(screen.getByText('Conversation')).toBeInTheDocument();
    expect(screen.getByTestId('genAiMessage-0')).toBeInTheDocument();
    expect(screen.getByTestId('genAiMessage-1')).toBeInTheDocument();
  });

  it('does not render conversation section when no messages', () => {
    renderTab({ inputMessages: [], outputMessages: [], systemInstructions: undefined });
    expect(screen.queryByText('Conversation')).toBeNull();
  });

  it('renders system instructions as first message when present', () => {
    renderTab({ systemInstructions: 'You are a helpful assistant.' });
    expect(screen.getByText('Conversation')).toBeInTheDocument();
    // The first comment is the system-instructions message
    expect(screen.getByTestId('genAiMessage-0')).toBeInTheDocument();
  });

  it('renders the response model row', () => {
    renderTab({ responseModel: 'gpt-4o-2024-08-06' });
    expect(screen.getByTestId('genAiDetails')).toBeInTheDocument();
    expect(screen.getByText('Response model')).toBeInTheDocument();
  });

  it('renders request params when present', () => {
    renderTab({ requestParams: { temperature: 0.7, max_tokens: 2048 } });
    expect(screen.getByText('temperature')).toBeInTheDocument();
    expect(screen.getByText('max_tokens')).toBeInTheDocument();
  });

  it('renders the Details section and the conversation section when data is present', () => {
    renderTab({
      responseModel: 'gpt-4o-2024-08-06',
      inputMessages: [{ role: 'user', content: 'Hello' }],
    });
    expect(screen.getByTestId('genAiSection-details')).toBeInTheDocument();
    expect(screen.getByTestId('genAiDetails')).toBeInTheDocument();
    expect(screen.getByTestId('genAiSection-conversation')).toBeInTheDocument();
    // No separate Summary section anymore — one flat Details table.
    expect(screen.queryByTestId('genAiSection-summary')).toBeNull();
  });

  it('omits the Conversation section when there are no messages', () => {
    renderTab({ responseModel: undefined, requestParams: {}, response: {} });
    expect(screen.getByTestId('genAiDetails')).toBeInTheDocument();
    expect(screen.queryByTestId('genAiSection-conversation')).toBeNull();
  });
});
