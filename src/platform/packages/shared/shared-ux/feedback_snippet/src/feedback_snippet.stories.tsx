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
import { FeedbackSnippet } from './feedback_snippet';

const meta: Meta<typeof FeedbackSnippet> = {
  title: 'Shared UX/FeedbackSnippet',
  component: FeedbackSnippet,
  args: {
    feedbackButtonMessage: 'Got feedback?',
    promptViewMessage: 'Was this page helpful? Tell us about it!',
    surveyUrl: 'https://www.elastic.co',
    feedbackSnippetId: 'storybook-feedback-snippet-default',
  },
  argTypes: {
    feedbackButtonMessage: { control: 'text' },
    promptViewMessage: { control: 'text' },
    surveyUrl: { control: 'text' },
    feedbackSnippetId: { control: 'text' },
  },
};

export default meta;
type Story = StoryObj<typeof FeedbackSnippet>;

export const Default: Story = {
  render: (args) => {
    localStorage.removeItem(args.feedbackSnippetId);
    return (
      <div
        css={{
          width: '250px',
        }}
      >
        <FeedbackSnippet {...args} />
      </div>
    );
  },
};
