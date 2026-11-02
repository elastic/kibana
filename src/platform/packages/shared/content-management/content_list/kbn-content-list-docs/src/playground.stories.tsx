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
import { PlaygroundBuilder } from './playground/playground_builder';

// =============================================================================
// Storybook Meta
// =============================================================================

const meta: Meta = {
  title: 'Content List',
  decorators: [
    (Story) => (
      <div style={{ padding: '20px' }}>
        <Story />
      </div>
    ),
  ],
};

export default meta;

// =============================================================================
// Playground Story
// =============================================================================

/**
 * Interactive visual builder for composing a Content List page.
 *
 * The builder panel (left) renders the component tree as JSX-like markup
 * with inline controls. Columns and toolbar filters can be reordered via
 * drag-and-drop and added from a component palette. The preview panel
 * (right) shows the live rendered result and the generated JSX.
 *
 */
export const Playground: StoryObj = {
  render: () => <PlaygroundBuilder />,
};
