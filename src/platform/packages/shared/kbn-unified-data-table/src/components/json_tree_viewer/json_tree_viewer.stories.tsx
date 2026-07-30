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
import { JsonTreeViewer } from './json_tree_viewer';

export default {
  title: 'UnifiedDataTable/JsonTreeViewer',
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

export const SimpleObject: StoryObj<typeof JsonTreeViewer> = {
  render: () => (
    <div style={{ width: 400 }}>
      <JsonTreeViewer json={{ name: 'Alice', age: 30, active: true, score: null }} />
    </div>
  ),
};

export const NestedDocument: StoryObj<typeof JsonTreeViewer> = {
  render: () => (
    <div style={{ width: 400 }}>
      <JsonTreeViewer json={nestedDocument} />
    </div>
  ),
};

export const LargeObject: StoryObj<typeof JsonTreeViewer> = {
  render: () => (
    <div style={{ width: 400 }}>
      <JsonTreeViewer json={largeDocument} />
    </div>
  ),
};

export const ArrayValue: StoryObj<typeof JsonTreeViewer> = {
  render: () => (
    <div style={{ width: 400 }}>
      <JsonTreeViewer json={['alpha', 'beta', { nested: true }, [1, 2, 3]]} />
    </div>
  ),
};

export const PrimitiveValue: StoryObj<typeof JsonTreeViewer> = {
  render: () => (
    <div style={{ width: 400 }}>
      <JsonTreeViewer json={42} />
    </div>
  ),
};
