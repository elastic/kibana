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
import { AgenticFirstEmptyState } from './agentic_first_empty_state';
import { kibanaReactDecorator } from '../../../.storybook/decorators';

const meta: Meta<typeof AgenticFirstEmptyState> = {
  title: 'Workflows/AgenticFirstEmptyState',
  component: AgenticFirstEmptyState,
  decorators: [kibanaReactDecorator],
  parameters: { layout: 'fullscreen' },
  args: {
    onSubmitPrompt: action('onSubmitPrompt'),
    onStartManually: action('onStartManually'),
    onExploreLibrary: action('onExploreLibrary'),
    onSelectExample: action('onSelectExample'),
  },
};

export default meta;
type Story = StoryObj<typeof AgenticFirstEmptyState>;

/**
 * Shown on the Workflows list when the space has no workflows yet.
 * The user is nudged toward writing a natural-language prompt first;
 * "Start manually" is available but demoted.
 */
export const WorkflowsListEmpty: Story = {};

/**
 * Shown on `/create` when the user clicks "Create New Workflow".
 * The dot-grid background hints that this is the editor surface —
 * the agentic prompt is the primary entry point, not the raw YAML editor.
 */
export const NewAutomationFlow: Story = {
  args: {
    withDotBackground: true,
  },
};
