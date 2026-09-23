/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import { JsonTreeViewer, type JsonTreeViewerProps, type JsonValue } from './json_tree_viewer';

type StoryArgs = Omit<JsonTreeViewerProps, 'formatValue'> & {
  containerWidth: number;
};

const meta: Meta<StoryArgs> = {
  title: 'UnifiedDataTable/JsonTreeViewer',
  component: JsonTreeViewer,
  argTypes: {
    json: {
      control: 'object',
      description: 'The document rendered as a JSON tree.',
    },
    expandNodesContainingTerm: {
      control: 'text',
      description: 'Active in-table search term; every collection containing a match auto-expands.',
    },
    containerWidth: {
      control: { type: 'range', min: 200, max: 900, step: 10 },
      description: 'Story-only: width of the wrapping container, to exercise value wrapping.',
      table: { category: 'Story knobs' },
    },
  },
  args: {
    expandNodesContainingTerm: '',
    containerWidth: 440,
  },
  render: ({ containerWidth, ...props }) => (
    <div style={{ width: containerWidth }}>
      <JsonTreeViewer {...props} />
    </div>
  ),
};

export default meta;

type Story = StoryObj<StoryArgs>;

const nestedDocument = {
  '@timestamp': '2024-01-15T10:30:00.000Z',
  message: 'User login successful',
  log: {
    level: 'info',
    logger: 'auth.service',
  },
  user: {
    id: 'u-42',
    name: 'Alice',
    roles: ['admin', 'viewer'],
  },
  http: {
    request: {
      method: 'POST',
      bytes: 1024,
    },
    response: {
      status_code: 200,
      bytes: 512,
    },
  },
  tags: ['authentication', 'security'],
  active: true,
  score: null,
};

const largeDocument = Object.fromEntries(
  Array.from({ length: 30 }, (_, i) => [`field_${i + 1}`, i % 3 === 0 ? null : i + 1])
);

// A deliberately huge document: a 2,000-field object, a 5,000-element array of nested
// objects, plus small collections. Fully expanded it would be ~7,000 rows without caps;
// the per-collection cap must keep the rendered DOM tiny at every level.
const largeNestedDocument = {
  summary: Object.fromEntries(Array.from({ length: 2000 }, (_, i) => [`field_${i + 1}`, i + 1])),
  events: Array.from({ length: 5000 }, (_, i) => ({
    id: i,
    name: `event_${i}`,
    tags: ['authentication', 'security', 'network'],
  })),
  meta: { total: 7000, truncated: true },
};

const longValueDocument = {
  message:
    'GET /api/v1/very/long/path?with=a&bunch=of&query=parameters that keeps going well beyond the width of the container to show wrapping behaviour',
  url: 'https://example.com/some/extremely/long/url/that/would/otherwise/overflow/the/panel/horizontally',
  stack: 'Error: boom\n    at handler (server.ts:42:11)\n    at process (runtime.ts:8:3)',
  status: 500,
};

const arrayValue: JsonValue = ['alpha', 'beta', { nested: true }, [1, 2, 3]];

export const JsonTreeViewerSimpleObject: Story = {
  args: { json: { name: 'Alice', age: 30, active: true, score: null } },
};

export const JsonTreeViewerNestedDocument: Story = {
  args: { json: nestedDocument },
};

export const JsonTreeViewerLargeObject: Story = {
  args: { json: largeDocument },
};

export const JsonTreeViewerLargeNested: Story = {
  args: { json: largeNestedDocument },
};

export const JsonTreeViewerArrayValue: Story = {
  args: { json: arrayValue },
};

export const JsonTreeViewerLongValues: Story = {
  args: { json: longValueDocument },
};
