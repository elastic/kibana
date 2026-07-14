/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { action } from '@storybook/addon-actions';
import type { StoryObj } from '@storybook/react';
import { z } from '@kbn/zod/v4';
import { TestStepModal } from './test_step_modal';
import { kibanaReactDecorator } from '../../../../.storybook/decorators';

export default {
  title: 'Workflows Management/Test Step Modal',
  component: TestStepModal,
  decorators: [kibanaReactDecorator],
};

type Story = StoryObj<typeof TestStepModal>;

/**
 * Default story with a simple schema - valid JSON
 */
export const Default: Story = {
  args: {
    initialcontextOverride: {
      stepContext: {
        inputs: {
          name: 'John Doe',
          age: 30,
        },
      },
      schema: z.object({
        inputs: z.object({
          name: z.string(),
          age: z.number(),
        }),
      }),
    },
    onClose: action('onClose'),
    onSubmit: action('onSubmit'),
  },
};

export const WithErrors: Story = {
  args: {
    initialcontextOverride: {
      stepContext: {
        inputs: {
          name1: 'John Doe',
          age: 'thirty',
        },
      },
      schema: z.object({
        inputs: z.object({
          name: z.string(),
          age: z.number(),
        }),
      }),
    },
    onClose: action('onClose'),
    onSubmit: action('onSubmit'),
  },
};
