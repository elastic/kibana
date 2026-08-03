/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useState } from 'react';
import { fn } from '@storybook/test';
import type { Meta, StoryObj } from '@storybook/react';
import type { AggregateQuery } from '@kbn/es-query';
import { ESQLEditor } from '../esql_editor';
import type { ESQLEditorProps } from '../esql_editor';
import { EditorServicesProvider } from './mock_services';

// Controlled story component — maintains query state locally and delegates
// to the fn() spies in args so changes are visible in the Actions panel.
const ControlledEditor = (props: ESQLEditorProps) => {
  const [query, setQuery] = useState(props.query);

  return (
    <EditorServicesProvider>
      <ESQLEditor
        {...props}
        query={query}
        onTextLangQueryChange={(q: AggregateQuery) => {
          setQuery(q);
          props.onTextLangQueryChange(q);
        }}
        onTextLangQuerySubmit={props.onTextLangQuerySubmit}
      />
    </EditorServicesProvider>
  );
};

// ---------------------------------------------------------------------------
// Stories meta
// ---------------------------------------------------------------------------

const meta: Meta<typeof ESQLEditor> = {
  title: 'ES|QL Editor',
  component: ESQLEditor,
  args: {
    onTextLangQueryChange: fn(),
    onTextLangQuerySubmit: fn(),
  },
  decorators: [
    (Story) => (
      <div style={{ padding: '24px' }}>
        <Story />
      </div>
    ),
  ],
  parameters: {
    layout: 'fullscreen',
    controls: { sort: 'alpha' },
  },
};

export default meta;
type Story = StoryObj<typeof ESQLEditor>;

// ---------------------------------------------------------------------------
// Stories
// ---------------------------------------------------------------------------

export const Default: Story = {
  name: 'Default',
  render: (args) => <ControlledEditor {...args} />,
  args: {
    query: { esql: 'FROM kibana_sample_data_logs | LIMIT 10' },
    hideQueryHistory: false,
    disableAutoFocus: true,
  },
};

export const InlineMode: Story = {
  name: 'Inline mode',
  render: (args) => <ControlledEditor {...args} />,
  args: {
    query: { esql: 'FROM kibana_sample_data_logs | LIMIT 10' },
    editorIsInline: true,
    hideQueryHistory: true,
    disableAutoFocus: true,
  },
};

export const WithErrors: Story = {
  name: 'With errors',
  render: (args) => <ControlledEditor {...args} />,
  args: {
    query: { esql: 'FROM kibana_sample_data_logs | KEEP unknown_field' },
    hideQueryHistory: true,
    disableAutoFocus: true,
    errors: [
      new Error(
        'verification_exception - Found 1 problem\nline 1:39: Unknown column [unknown_field]'
      ),
    ],
  },
};

export const WithWarning: Story = {
  name: 'With warning',
  render: (args) => <ControlledEditor {...args} />,
  args: {
    query: {
      esql: 'FROM kibana_sample_data_logs | EVAL ratio = bytes / 0 | KEEP @timestamp, ratio | LIMIT 10',
    },
    hideQueryHistory: true,
    disableAutoFocus: true,
    warning:
      'Line 1:43: evaluation of [bytes / 0] failed, treating result as null. Only first 20 failures recorded.',
  },
};

export const WithHistoryOpen: Story = {
  name: 'With history open',
  render: (args) => <ControlledEditor {...args} />,
  args: {
    query: { esql: 'FROM kibana_sample_data_logs | LIMIT 10' },
    editorIsInline: true,
    hideQueryHistory: false,
    disableAutoFocus: true,
    initialState: { isHistoryOpen: true },
  },
};
