/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { Meta } from '@storybook/react';
import { DataCascade, DataCascadeRow, DataCascadeRowCell } from '../components';
import { CascadeCustomHeaderWithRowSelectionActionEnabled as CascadeCustomHeaderWithRowSelectionActionEnabledScene } from './scenes/row_selection';
import { CascadeCustomHeaderImplementation as CascadeCustomHeaderImplementationScene } from './scenes/custom_header';
import { CascadeMultipleStatsPerRow as CascadeMultipleStatsPerRowScene } from './scenes/multiple_stats_per_row';
import { CascadeCustomHeaderWithCustomRowActionsImplementation as CascadeCustomHeaderWithCustomRowActionsImplementationScene } from './scenes/custom_header_with_custom_row_actions';
import { CascadeCustomHeaderWithHiddenRowActions as CascadeCustomHeaderWithHiddenRowActionsScene } from './scenes/custom_header_with_hidden_row_actions';
import { CascadeNestedGridImplementation as CascadeNestedGridImplementationScene } from './scenes/nested_groups';
import { CascadeWithNestedVirtualization as CascadeNestedVirtualizationImplementationScene } from './scenes/nested_virtualization';
import mdx from './guide.mdx';

/**
 * @description story for data document cascade component which allows rendering of data in a quasi tree structure',
 * this story emulates ES|QL scenario of doing stats on a dataset to show the data grouped by some fields.
 */
export default {
  title: 'Data Cascade/Configuration Examples',
  component: DataCascade,
  subcomponents: { DataCascadeRow, DataCascadeRowCell },
  parameters: {
    docs: {
      page: mdx,
    },
  },
  tags: ['autodocs'],
} satisfies Meta;

// Re-export with explicit name so Storybook's static indexer picks up the display name.
// Direct re-exports only see the export name; the indexer does not read story.name from other files.
export const CascadeNestedGridImplementation = {
  ...CascadeNestedGridImplementationScene,
  name: 'Nested Groups with Default Header',
};

export const CascadeCustomHeaderWithRowSelectionActionEnabled = {
  ...CascadeCustomHeaderWithRowSelectionActionEnabledScene,
  name: 'Custom header with row selection action enabled',
};

export const CascadeCustomHeaderImplementation = {
  ...CascadeCustomHeaderImplementationScene,
  name: 'Custom header with one level of grouping',
};

export const CascadeMultipleStatsPerRow = {
  ...CascadeMultipleStatsPerRowScene,
  name: 'Multiple stats per row',
};

export const CascadeCustomHeaderWithCustomRowActionsImplementation = {
  ...CascadeCustomHeaderWithCustomRowActionsImplementationScene,
  name: 'Custom header with custom row actions',
};

export const CascadeCustomHeaderWithHiddenRowActions = {
  ...CascadeCustomHeaderWithHiddenRowActionsScene,
  name: 'Custom header with hidden row actions',
};

export const CascadeWithNestedVirtualization = {
  ...CascadeNestedVirtualizationImplementationScene,
  name: 'Cascade with nested virtualization',
};
