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
import { JsonTreeViewer } from './json_tree_viewer';
import { JsonFieldTree } from './json_field_tree';
import { JsonSyntaxTree, type JsonValue } from './json_syntax_tree';

export default {
  title: 'UnifiedDataTable/JsonSyntaxTree (Prototype B)',
  component: JsonSyntaxTree,
} as Meta<typeof JsonSyntaxTree>;

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

const longValueDocument = {
  message:
    'GET /api/v1/very/long/path?with=a&bunch=of&query=parameters that keeps going well beyond the width of the container to show wrapping behaviour',
  url: 'https://example.com/some/extremely/long/url/that/would/otherwise/overflow/the/panel/horizontally',
  stack: 'Error: boom\n    at handler (server.ts:42:11)\n    at process (runtime.ts:8:3)',
  status: 500,
};

const arrayValue: JsonValue = ['alpha', 'beta', { nested: true }, [1, 2, 3]];

const Column = ({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle: string;
  children: React.ReactNode;
}) => (
  <EuiFlexItem grow={false}>
    <EuiTitle size="xxs">
      <h3>{title}</h3>
    </EuiTitle>
    <EuiText size="xs" color="subdued">
      <p>{subtitle}</p>
    </EuiText>
    <EuiPanel hasShadow={false} hasBorder paddingSize="s" css={{ width: 420, marginTop: 8 }}>
      {children}
    </EuiPanel>
  </EuiFlexItem>
);

// Three-way comparison: the current EuiTreeView viewer, the clean field tree (Prototype A),
// and the field tree with literal JSON styling (Prototype B).
const Comparison = ({ json }: { json: JsonValue }) => (
  <EuiFlexGroup gutterSize="l" alignItems="flexStart" responsive={false}>
    <Column title="Current — JsonTreeViewer" subtitle="EuiTreeView, literal JSON styling">
      <JsonTreeViewer json={json} />
    </Column>
    <Column title="Prototype A — JsonFieldTree" subtitle="Field tree, clean key: value rows">
      <JsonFieldTree json={json} />
    </Column>
    <Column title="Prototype B — JsonSyntaxTree" subtitle="Field tree, literal JSON styling">
      <JsonSyntaxTree json={json} />
    </Column>
  </EuiFlexGroup>
);

// ---- Side-by-side comparisons ----

export const CompareNestedDocument: StoryObj<typeof JsonSyntaxTree> = {
  render: () => <Comparison json={nestedDocument} />,
};

export const CompareLargeObject: StoryObj<typeof JsonSyntaxTree> = {
  render: () => <Comparison json={largeDocument} />,
};

export const CompareArrayValue: StoryObj<typeof JsonSyntaxTree> = {
  render: () => <Comparison json={arrayValue} />,
};

export const CompareLongValues: StoryObj<typeof JsonSyntaxTree> = {
  render: () => <Comparison json={longValueDocument} />,
};

// ---- Prototype B on its own ----

export const SyntaxTreeSimpleObject: StoryObj<typeof JsonSyntaxTree> = {
  render: () => (
    <div style={{ width: 440 }}>
      <JsonSyntaxTree json={{ name: 'Alice', age: 30, active: true, score: null }} />
    </div>
  ),
};

export const SyntaxTreeNestedDocument: StoryObj<typeof JsonSyntaxTree> = {
  render: () => (
    <div style={{ width: 440 }}>
      <JsonSyntaxTree json={nestedDocument} />
    </div>
  ),
};

export const SyntaxTreeLargeObject: StoryObj<typeof JsonSyntaxTree> = {
  render: () => (
    <div style={{ width: 440 }}>
      <JsonSyntaxTree json={largeDocument} />
    </div>
  ),
};

export const SyntaxTreeArrayValue: StoryObj<typeof JsonSyntaxTree> = {
  render: () => (
    <div style={{ width: 440 }}>
      <JsonSyntaxTree json={arrayValue} />
    </div>
  ),
};

export const SyntaxTreeLongValues: StoryObj<typeof JsonSyntaxTree> = {
  render: () => (
    <div style={{ width: 440 }}>
      <JsonSyntaxTree json={longValueDocument} />
    </div>
  ),
};

export const SyntaxTreePrimitiveValue: StoryObj<typeof JsonSyntaxTree> = {
  render: () => (
    <div style={{ width: 440 }}>
      <JsonSyntaxTree json={42} />
    </div>
  ),
};
