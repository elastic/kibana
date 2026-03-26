/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { action } from '@storybook/addon-actions';
import type { Meta, StoryObj } from '@storybook/react';
import { EuiPanel, EuiText, EuiSpacer, EuiTitle } from '@elastic/eui';
import { ContentManagementTagsProvider } from '../services';
import { TagList } from './tag_list';
import type { Tag } from '../types';

interface StoryArgs {
  interactive: boolean;
  numberOfTags: number;
  includeManagedTags: boolean;
}

// Mock tag data
const mockTags: Tag[] = [
  {
    id: 'tag-1',
    name: 'Urgent',
    description: 'High priority items',
    color: '#BD271E',
    managed: false,
  },
  {
    id: 'tag-2',
    name: 'Important',
    description: 'Important items to review',
    color: '#FF6B6B',
    managed: false,
  },
  {
    id: 'tag-3',
    name: 'In Progress',
    description: 'Work in progress',
    color: '#3498DB',
    managed: false,
  },
  {
    id: 'tag-4',
    name: 'Approved',
    description: 'Approved for release',
    color: '#4CAF50',
    managed: false,
  },
  {
    id: 'tag-5',
    name: 'Archived',
    description: 'Archived items',
    color: '#808080',
    managed: true,
  },
  {
    id: 'tag-6',
    name: 'Compliance',
    description: 'Compliance related items',
    color: '#6F42C1',
    managed: true,
  },
];

const meta: Meta<StoryArgs> = {
  title: 'Content Management/Tags/Tag List',
  component: TagList,
  decorators: [
    (Story) => {
      const getTagList = () => mockTags;

      return (
        <ContentManagementTagsProvider {...{ getTagList }}>
          <Story />
        </ContentManagementTagsProvider>
      );
    },
  ],
  parameters: {
    layout: 'padded',
  },
  argTypes: {
    interactive: {
      control: 'boolean',
      description: 'Whether tags are clickable for filtering',
    },
    numberOfTags: {
      control: { type: 'range', min: 0, max: 6, step: 1 },
      description: 'Number of tags to display (0-6)',
    },
    includeManagedTags: {
      control: 'boolean',
      description: 'Include managed (read-only) tags',
    },
  },
};

export default meta;

type Story = StoryObj<StoryArgs>;

export const Examples: Story = {
  render: () => {
    return (
      <div>
        <EuiTitle size="s">
          <h3>Dashboard Examples</h3>
        </EuiTitle>

        <EuiSpacer size="m" />

        {/* Example 1: Multiple tags */}
        <EuiPanel hasBorder>
          <EuiText size="s">
            <strong>Marketing Dashboard</strong>
          </EuiText>
          <EuiText size="xs" color="subdued">
            <p>Last updated 2 hours ago</p>
          </EuiText>
          <EuiSpacer size="s" />
          <TagList tagIds={['tag-1', 'tag-2', 'tag-3']} onClick={action('Dashboard 1 tag click')} />
        </EuiPanel>

        <EuiSpacer size="m" />

        {/* Example 2: Single tag */}
        <EuiPanel hasBorder>
          <EuiText size="s">
            <strong>Sales Report</strong>
          </EuiText>
          <EuiText size="xs" color="subdued">
            <p>Last updated yesterday</p>
          </EuiText>
          <EuiSpacer size="s" />
          <TagList tagIds={['tag-4']} onClick={action('Dashboard 2 tag click')} />
        </EuiPanel>

        <EuiSpacer size="m" />

        {/* Example 3: Managed tags */}
        <EuiPanel hasBorder>
          <EuiText size="s">
            <strong>Compliance Report</strong>
          </EuiText>
          <EuiText size="xs" color="subdued">
            <p>Last updated last week</p>
          </EuiText>
          <EuiSpacer size="s" />
          <TagList tagIds={['tag-5', 'tag-6']} onClick={action('Dashboard 3 tag click')} />
        </EuiPanel>

        <EuiSpacer size="m" />

        {/* Example 4: Mixed managed and unmanaged */}
        <EuiPanel hasBorder>
          <EuiText size="s">
            <strong>Executive Summary</strong>
          </EuiText>
          <EuiText size="xs" color="subdued">
            <p>Last updated 5 minutes ago</p>
          </EuiText>
          <EuiSpacer size="s" />
          <TagList tagIds={['tag-1', 'tag-4', 'tag-6']} onClick={action('Dashboard 4 tag click')} />
        </EuiPanel>

        <EuiSpacer size="m" />

        {/* Example 5: No tags */}
        <EuiPanel hasBorder>
          <EuiText size="s">
            <strong>Untagged Dashboard</strong>
          </EuiText>
          <EuiText size="xs" color="subdued">
            <p>Last updated today</p>
          </EuiText>
          <EuiSpacer size="s" />
          <TagList tagIds={[]} onClick={action('Dashboard 5 tag click')} />
          <EuiText size="xs" color="subdued">
            <em>(No tags)</em>
          </EuiText>
        </EuiPanel>

        <EuiSpacer size="l" />

        <EuiTitle size="s">
          <h3>Display-Only Mode</h3>
        </EuiTitle>

        <EuiSpacer size="m" />

        <EuiPanel hasBorder>
          <EuiText size="s">
            <strong>Read-Only Dashboard</strong>
          </EuiText>
          <EuiText size="xs" color="subdued">
            <p>Tags are shown but not interactive</p>
          </EuiText>
          <EuiSpacer size="s" />
          <TagList tagIds={['tag-1', 'tag-2', 'tag-4']} />
        </EuiPanel>
      </div>
    );
  },
};

export const Playground: Story = {
  args: {
    interactive: true,
    numberOfTags: 3,
    includeManagedTags: false,
  },
  render: (args) => {
    const selectedTags = mockTags
      .filter((tag) => (args.includeManagedTags ? true : !tag.managed))
      .slice(0, args.numberOfTags);

    const tagIds: string[] = selectedTags.map((tag) => tag.id!);

    return (
      <div>
        <EuiText size="s">
          <p>
            <strong>Displaying {tagIds.length} tag(s)</strong>
          </p>
          <p>
            {args.interactive
              ? 'Click tags to filter, Cmd/Ctrl+Click to exclude'
              : 'Tags are display-only'}
          </p>
        </EuiText>

        <EuiSpacer size="m" />

        <EuiPanel hasShadow={false} hasBorder>
          <TagList tagIds={tagIds} onClick={args.interactive ? action('onTagClick') : undefined} />
        </EuiPanel>
      </div>
    );
  },
};
