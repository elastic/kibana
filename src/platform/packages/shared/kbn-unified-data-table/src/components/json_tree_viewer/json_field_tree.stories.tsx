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
import { EuiFlexGroup, EuiFlexItem, EuiPanel, EuiText, EuiTitle } from '@elastic/eui';
import { JsonTreeViewer, type JsonValue } from './json_tree_viewer';
import { JsonFieldTree } from './json_field_tree';

export default {
  title: 'UnifiedDataTable/JsonFieldTree (Prototype A)',
  component: JsonFieldTree,
} as Meta<typeof JsonFieldTree>;

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

const Comparison = ({ json }: { json: JsonValue }) => (
  <EuiFlexGroup gutterSize="l" alignItems="flexStart" responsive={false}>
    <EuiFlexItem grow={false}>
      <EuiTitle size="xxs">
        <h3>Current — JsonTreeViewer</h3>
      </EuiTitle>
      <EuiText size="xs" color="subdued">
        <p>EuiTreeView, literal JSON styling</p>
      </EuiText>
      <EuiPanel hasShadow={false} hasBorder paddingSize="s" css={{ width: 440, marginTop: 8 }}>
        <JsonTreeViewer json={json} />
      </EuiPanel>
    </EuiFlexItem>
    <EuiFlexItem grow={false}>
      <EuiTitle size="xxs">
        <h3>Prototype A — JsonFieldTree</h3>
      </EuiTitle>
      <EuiText size="xs" color="subdued">
        <p>Field tree, controlled expansion, copy</p>
      </EuiText>
      <EuiPanel hasShadow={false} hasBorder paddingSize="s" css={{ width: 440, marginTop: 8 }}>
        <JsonFieldTree json={json} />
      </EuiPanel>
    </EuiFlexItem>
  </EuiFlexGroup>
);

// ---- Side-by-side comparisons ----

export const CompareNestedDocument: StoryObj<typeof JsonFieldTree> = {
  render: () => <Comparison json={nestedDocument} />,
};

export const CompareLargeObject: StoryObj<typeof JsonFieldTree> = {
  render: () => <Comparison json={largeDocument} />,
};

export const CompareArrayValue: StoryObj<typeof JsonFieldTree> = {
  render: () => <Comparison json={arrayValue} />,
};

export const CompareLongValues: StoryObj<typeof JsonFieldTree> = {
  render: () => <Comparison json={longValueDocument} />,
};

// ---- Prototype A on its own ----

export const FieldTreeSimpleObject: StoryObj<typeof JsonFieldTree> = {
  render: () => (
    <div style={{ width: 440 }}>
      <JsonFieldTree json={{ name: 'Alice', age: 30, active: true, score: null }} />
    </div>
  ),
};

export const FieldTreeNestedDocument: StoryObj<typeof JsonFieldTree> = {
  render: () => (
    <div style={{ width: 440 }}>
      <JsonFieldTree json={nestedDocument} />
    </div>
  ),
};

export const FieldTreeLargeObject: StoryObj<typeof JsonFieldTree> = {
  render: () => (
    <div style={{ width: 440 }}>
      <JsonFieldTree json={largeDocument} />
    </div>
  ),
};

export const FieldTreeLargeNested: StoryObj<typeof JsonFieldTree> = {
  render: () => (
    <div style={{ width: 440 }}>
      <JsonFieldTree json={largeNestedDocument} />
    </div>
  ),
};

export const FieldTreeArrayValue: StoryObj<typeof JsonFieldTree> = {
  render: () => (
    <div style={{ width: 440 }}>
      <JsonFieldTree json={arrayValue} />
    </div>
  ),
};

export const FieldTreePrimitiveValue: StoryObj<typeof JsonFieldTree> = {
  render: () => (
    <div style={{ width: 440 }}>
      <JsonFieldTree json={42} />
    </div>
  ),
};
