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
import { JsonTreeViewer, type JsonValue } from './json_tree_viewer';

export default {
  title: 'UnifiedDataTable/JsonSyntaxTree',
  component: JsonTreeViewer,
} as Meta<typeof JsonTreeViewer>;

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

export const SyntaxTreeSimpleObject: StoryObj<typeof JsonTreeViewer> = {
  render: () => (
    <div style={{ width: 440 }}>
      <JsonTreeViewer json={{ name: 'Alice', age: 30, active: true, score: null }} />
    </div>
  ),
};

export const SyntaxTreeNestedDocument: StoryObj<typeof JsonTreeViewer> = {
  render: () => (
    <div style={{ width: 440 }}>
      <JsonTreeViewer json={nestedDocument} />
    </div>
  ),
};

export const SyntaxTreeLargeObject: StoryObj<typeof JsonTreeViewer> = {
  render: () => (
    <div style={{ width: 440 }}>
      <JsonTreeViewer json={largeDocument} />
    </div>
  ),
};

export const SyntaxTreeLargeNested: StoryObj<typeof JsonTreeViewer> = {
  render: () => (
    <div style={{ width: 440 }}>
      <JsonTreeViewer json={largeNestedDocument} />
    </div>
  ),
};

export const SyntaxTreeArrayValue: StoryObj<typeof JsonTreeViewer> = {
  render: () => (
    <div style={{ width: 440 }}>
      <JsonTreeViewer json={arrayValue} />
    </div>
  ),
};

export const SyntaxTreeLongValues: StoryObj<typeof JsonTreeViewer> = {
  render: () => (
    <div style={{ width: 440 }}>
      <JsonTreeViewer json={longValueDocument} />
    </div>
  ),
};

export const SyntaxTreePrimitiveValue: StoryObj<typeof JsonTreeViewer> = {
  render: () => (
    <div style={{ width: 440 }}>
      <JsonTreeViewer json={42} />
    </div>
  ),
};
