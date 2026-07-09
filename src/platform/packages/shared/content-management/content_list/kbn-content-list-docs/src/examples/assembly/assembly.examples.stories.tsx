/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import type { Meta } from '@storybook/react';
import type { EmbeddableStoryObj } from '@kbn/storybook';

import { BasicActionBarExample } from './basic_action_bar.example';
import { PartExample } from './part.example';
import { PresetExample } from './preset.example';
import { NamespaceExample } from './namespace.example';
import { ParsingExample } from './parsing.example';
import { ResolvingExample } from './resolving.example';
import { ContextExample } from './context.example';
import { ExternalTaggingExample } from './external_tagging.example';

/**
 * Embeddable stories for the Assembly documentation examples. Each story wraps a
 * self-contained `*.example.tsx` component so docs-builder can embed the live render via
 * `:::{storybook}` while the same source file is shown inline via `:::{literalinclude}`.
 */
const meta: Meta = {
  title: 'Assembly/Examples',
};

export default meta;

export const BasicActionBar: EmbeddableStoryObj = {
  tags: ['embeddable'],
  parameters: { embeddable: { height: 64 } },
  render: () => <BasicActionBarExample />,
};

export const Part: EmbeddableStoryObj = {
  tags: ['embeddable'],
  parameters: { embeddable: { height: 64 } },
  render: () => <PartExample />,
};

export const Preset: EmbeddableStoryObj = {
  tags: ['embeddable'],
  parameters: { embeddable: { height: 64 } },
  render: () => <PresetExample />,
};

export const Namespace: EmbeddableStoryObj = {
  tags: ['embeddable'],
  parameters: { embeddable: { height: 64 } },
  render: () => <NamespaceExample />,
};

export const Parsing: EmbeddableStoryObj = {
  tags: ['embeddable'],
  parameters: { embeddable: { height: 320 } },
  render: () => <ParsingExample />,
};

export const Resolving: EmbeddableStoryObj = {
  tags: ['embeddable'],
  parameters: { embeddable: { height: 64 } },
  render: () => <ResolvingExample />,
};

export const Context: EmbeddableStoryObj = {
  tags: ['embeddable'],
  parameters: { embeddable: { height: 80 } },
  render: () => <ContextExample />,
};

export const ExternalTagging: EmbeddableStoryObj = {
  tags: ['embeddable'],
  parameters: { embeddable: { height: 64 } },
  render: () => <ExternalTaggingExample />,
};
