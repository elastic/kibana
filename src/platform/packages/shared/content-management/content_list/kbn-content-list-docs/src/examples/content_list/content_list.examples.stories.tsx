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

import { MinimalListExample } from './minimal_list.example';
import { StandardKibanaPageExample } from './standard_kibana_page.example';
import { CustomShellExample } from './custom_shell.example';
import { CustomColumnExample } from './custom_column.example';
import { FiltersExample } from './filters.example';
import { EmptyStatesExample } from './empty_states.example';
import { DeleteFlowExample } from './delete_flow.example';

/**
 * Embeddable stories for the Content List documentation examples. Each story wraps a
 * self-contained `*.example.tsx` component so docs-builder can embed the live render via
 * `:::{storybook}` while the same source file is shown inline via `:::{literalinclude}`.
 */
const meta: Meta = {
  title: 'Content List/Examples',
};

export default meta;

export const Minimal: EmbeddableStoryObj = {
  tags: ['embeddable'],
  parameters: { embeddable: { height: 520 } },
  render: () => <MinimalListExample />,
};

export const StandardPage: EmbeddableStoryObj = {
  tags: ['embeddable'],
  parameters: { embeddable: { height: 640 } },
  render: () => <StandardKibanaPageExample />,
};

export const CustomShell: EmbeddableStoryObj = {
  tags: ['embeddable'],
  parameters: { embeddable: { height: 560 } },
  render: () => <CustomShellExample />,
};

export const CustomColumn: EmbeddableStoryObj = {
  tags: ['embeddable'],
  parameters: { embeddable: { height: 520 } },
  render: () => <CustomColumnExample />,
};

export const Filters: EmbeddableStoryObj = {
  tags: ['embeddable'],
  parameters: { embeddable: { height: 560 } },
  render: () => <FiltersExample />,
};

export const EmptyStates: EmbeddableStoryObj = {
  tags: ['embeddable'],
  parameters: { embeddable: { height: 360 } },
  render: () => <EmptyStatesExample />,
};

export const DeleteFlow: EmbeddableStoryObj = {
  tags: ['embeddable'],
  parameters: { embeddable: { height: 520 } },
  render: () => <DeleteFlowExample />,
};
