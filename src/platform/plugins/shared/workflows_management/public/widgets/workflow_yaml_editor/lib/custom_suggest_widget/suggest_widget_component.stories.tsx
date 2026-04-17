/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { action } from '@storybook/addon-actions';
import type { Meta, StoryObj } from '@storybook/react';
import React, { useState } from 'react';
import { monaco } from '@kbn/monaco';

import { SuggestWidgetComponent } from './suggest_widget_component';
import type { EnrichedSuggestionItem } from './types';
import { kibanaReactDecorator } from '../../../../../.storybook/decorators';

const range: monaco.IRange = {
  startLineNumber: 1,
  startColumn: 1,
  endLineNumber: 1,
  endColumn: 1,
};

const makeVariable = (
  label: string,
  description: string,
  types: string[] = ['string'],
  example?: string
): EnrichedSuggestionItem => ({
  label,
  insertText: label,
  kind: monaco.languages.CompletionItemKind.Field,
  range,
  types,
  required: null,
  description,
  example,
  category: 'variable',
  contextLabel: 'Template Variable',
});

const makeConnector = (
  label: string,
  description: string,
  isBuiltIn = false
): EnrichedSuggestionItem => ({
  label,
  insertText: label,
  kind: monaco.languages.CompletionItemKind.Module,
  range,
  types: [isBuiltIn ? 'step' : 'action'],
  required: null,
  description: isBuiltIn ? `Built-in: ${description}` : description,
  category: 'connector',
  contextLabel: 'Step Type',
});

const makeParam = (
  label: string,
  description: string,
  types: string[],
  required: boolean,
  defaultValue?: string
): EnrichedSuggestionItem => ({
  label,
  insertText: label,
  kind: monaco.languages.CompletionItemKind.Property,
  range,
  types,
  required,
  description,
  defaultValue,
  category: 'param',
  contextLabel: 'Parameter',
});

// ── Fixtures ──────────────────────────────────────────────────────────────────

const VARIABLE_ITEMS: EnrichedSuggestionItem[] = [
  makeVariable(
    'event',
    'The triggering event payload, including alerts and metadata.',
    ['{ spaceId: string; alerts: object[] }'],
    '{{ event.alerts[0].id }}'
  ),
  makeVariable(
    'execution',
    'Metadata about the current workflow execution (id, timestamps, actor).',
    ['{ id: string; startedAt: string }']
  ),
  makeVariable('workflow', 'The workflow definition: id, name, enabled flag, space.', [
    '{ id: string; name: string; enabled: boolean; spaceId: string }',
  ]),
  makeVariable('inputs', 'User-provided inputs declared at the top of the workflow.', [
    'Record<string, unknown>',
  ]),
  makeVariable('steps', 'Outputs from previously executed steps, keyed by step name.', [
    'Record<string, { output: unknown }>',
  ]),
  makeVariable('consts', 'Constants declared in the workflow.', ['Record<string, unknown>']),
  makeVariable('secrets', 'Secrets resolved for this execution.', ['Record<string, string>']),
  makeVariable('now', 'Current timestamp when the expression is evaluated.', ['string']),
  makeVariable('kibanaUrl', 'Public Kibana URL for deep-linking.', ['string']),
];

const CONNECTOR_ITEMS: EnrichedSuggestionItem[] = [
  makeConnector('if', 'Conditional branching step.', true),
  makeConnector('foreach', 'Iterate over a collection.', true),
  makeConnector('parallel', 'Run child steps concurrently.', true),
  makeConnector('console.log', 'Print a message to the execution log.', false),
  makeConnector('slack.postMessage', 'Post a message to a Slack channel via the Slack connector.'),
  makeConnector('elasticsearch.search', 'Run an Elasticsearch search query.'),
  makeConnector('kibana.getSpace', 'Fetch a Kibana space by ID.'),
];

const PARAM_ITEMS: EnrichedSuggestionItem[] = [
  makeParam('message', 'The message text to send.', ['string'], true),
  makeParam(
    'channel',
    'Channel name or ID (e.g. #general or C0123456).',
    ['string'],
    true,
    '#general'
  ),
  makeParam('username', 'Override the bot display name for this message.', ['string'], false),
  makeParam('thread_ts', 'Thread timestamp to reply into.', ['string'], false),
  makeParam('blocks', 'Rich message blocks (Slack Block Kit).', ['BlockKitBlock[]'], false, '[]'),
];

// Harness lets stories toggle selected index without wiring full parent state.
const Harness: React.FC<{
  items: EnrichedSuggestionItem[];
  filterText: string;
  initialIndex?: number;
  isVisible?: boolean;
}> = ({ items, filterText, initialIndex = 0, isVisible = true }) => {
  const [selectedIndex, setSelectedIndex] = useState(initialIndex);
  return (
    <div style={{ padding: 24, background: 'transparent' }}>
      <SuggestWidgetComponent
        items={items}
        filterText={filterText}
        selectedIndex={selectedIndex}
        isVisible={isVisible}
        onSelect={setSelectedIndex}
        onAccept={(i) => {
          setSelectedIndex(i);
          action('onAccept')(i);
        }}
      />
    </div>
  );
};

const meta: Meta<typeof Harness> = {
  title: 'WorkflowYamlEditor/CustomSuggestWidget',
  component: Harness,
  decorators: [kibanaReactDecorator],
  parameters: {
    layout: 'fullscreen',
  },
};
export default meta;

type Story = StoryObj<typeof Harness>;

// ── Stories ───────────────────────────────────────────────────────────────────

export const TemplateVariables: Story = {
  name: 'Template variables (default @ trigger)',
  args: {
    items: VARIABLE_ITEMS,
    filterText: '',
    initialIndex: 0,
  },
};

export const FilteredByPrefix: Story = {
  name: 'Filtered by prefix ("work")',
  args: {
    items: VARIABLE_ITEMS,
    filterText: 'work',
    initialIndex: 0,
  },
};

export const FilteredFuzzy: Story = {
  name: 'Fuzzy filter ("exc")',
  args: {
    items: VARIABLE_ITEMS,
    filterText: 'exc',
    initialIndex: 0,
  },
};

export const SelectedSecondItem: Story = {
  name: 'Selection other than first',
  args: {
    items: VARIABLE_ITEMS,
    filterText: '',
    initialIndex: 2,
  },
};

export const ConnectorsAndSteps: Story = {
  name: 'Connectors + built-in steps',
  args: {
    items: CONNECTOR_ITEMS,
    filterText: '',
    initialIndex: 0,
  },
};

export const RequiredParameters: Story = {
  name: 'Parameters with required / default values',
  args: {
    items: PARAM_ITEMS,
    filterText: '',
    initialIndex: 0,
  },
};

export const SingleItem: Story = {
  name: 'Single match',
  args: {
    items: [VARIABLE_ITEMS[0]],
    filterText: 'event',
    initialIndex: 0,
  },
};

export const NoMatchesHidden: Story = {
  name: 'No matches — widget hidden',
  args: {
    items: VARIABLE_ITEMS,
    filterText: 'qqq',
    initialIndex: 0,
  },
};

export const ExplicitlyHidden: Story = {
  name: 'Explicitly hidden (isVisible=false)',
  args: {
    items: VARIABLE_ITEMS,
    filterText: '',
    isVisible: false,
    initialIndex: 0,
  },
};

// Mirror a realistic "steps" variable where the Zod schema dump is very long.
// The TYPE pill should clamp to a max height and scroll internally rather than
// flood the details panel.
const HEAVY_ZOD_TYPE =
  '{ search_critical_alerts: { output?: { took: number // The number of milliseconds it took Elasticsearch to run the request. This value is calculated by measuring the time elapsed between receipt of a request on the coordinating node and the time at which the coordinating node is ready to send the response. It includes: * Communication time between the coordinating node and data nodes * Time the request spends in the search thread pool, queued for execution * Actual run time. It does not include: * Time needed to send the request to Elasticsearch * Time needed to serialize the JSON response * Time needed to send the response to a client; timed_out: boolean // If `true`, the request timed out before completion; returned results may be partial or empty.; _shards: { failed: number; successful: number; total: number; failures?: { index?: string; node?: string; reason: { type: string // The type of error; reason?: (string | null); stack_trace?: string // The server stack trace. Present only if the error_trace=true parameter was sent with the request. } }[] } } } }';

export const LongType: Story = {
  name: 'Long Zod type (steps) — clamped & scrollable',
  args: {
    items: [
      {
        ...makeVariable('steps', '', [HEAVY_ZOD_TYPE]),
      },
    ],
    filterText: '',
    initialIndex: 0,
  },
};
