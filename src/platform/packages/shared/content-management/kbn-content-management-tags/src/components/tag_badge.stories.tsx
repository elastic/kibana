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
import { EuiFlexGroup, EuiFlexItem, EuiText, EuiSpacer } from '@elastic/eui';
import { TagBadge, type TagBadgeProps } from './tag_badge';
import type { Tag } from '../types';

interface StoryArgs extends Partial<TagBadgeProps> {
  tagName: string;
  tagDescription: string;
  tagColor: string;
  managed: boolean;
  interactive: boolean;
}

const meta: Meta<StoryArgs> = {
  title: 'Content Management/Tags/Tag Badge',
  component: TagBadge,
  parameters: {
    layout: 'centered',
  },
  argTypes: {
    tagName: {
      control: 'text',
      description: 'The name of the tag',
    },
    tagDescription: {
      control: 'text',
      description: 'Description shown in the title attribute',
    },
    tagColor: {
      control: 'color',
      description: 'Badge background color',
    },
    managed: {
      control: 'boolean',
      description: 'Whether the tag is managed (read-only)',
    },
    interactive: {
      control: 'boolean',
      description: 'Whether the badge is clickable',
    },
    tag: {
      table: { disable: true },
    },
    onClick: {
      table: { disable: true },
    },
  },
};

export default meta;

type Story = StoryObj<StoryArgs>;

export const Examples: Story = {
  argTypes: {
    tagName: {
      table: { disable: true },
    },
    tagDescription: {
      table: { disable: true },
    },
    tagColor: {
      table: { disable: true },
    },
    managed: {
      table: { disable: true },
    },
    interactive: {
      table: { disable: true },
    },
  },
  render: () => {
    const tags: Tag[] = [
      {
        id: 'urgent',
        name: 'Urgent',
        description: 'High priority items',
        color: '#BD271E',
        managed: false,
      },
      {
        id: 'important',
        name: 'Important',
        description: 'Important items',
        color: '#FF6B6B',
        managed: false,
      },
      {
        id: 'review',
        name: 'Needs Review',
        description: 'Items pending review',
        color: '#FFA500',
        managed: false,
      },
      {
        id: 'approved',
        name: 'Approved',
        description: 'Approved items',
        color: '#4CAF50',
        managed: false,
      },
      {
        id: 'archived',
        name: 'Archived',
        description: 'Archived items (managed)',
        color: '#808080',
        managed: true,
      },
      {
        id: 'compliance',
        name: 'Compliance',
        description: 'Compliance related (managed)',
        color: '#6F42C1',
        managed: true,
      },
    ];

    return (
      <div>
        <EuiText>
          <h3>Interactive Tags</h3>
          <p>Click to filter, Cmd/Ctrl+Click to exclude from filter</p>
        </EuiText>

        <EuiSpacer size="m" />

        <EuiFlexGroup wrap gutterSize="s">
          {tags.map((tag) => (
            <EuiFlexItem key={tag.id} grow={false}>
              <TagBadge tag={tag} onClick={action(`onClick: ${tag.name}`)} />
            </EuiFlexItem>
          ))}
        </EuiFlexGroup>

        <EuiSpacer size="l" />

        <EuiText>
          <h3>Display Only Tags</h3>
          <p>Non-interactive badges without click handlers</p>
        </EuiText>

        <EuiSpacer size="m" />

        <EuiFlexGroup wrap gutterSize="s">
          {tags.map((tag) => (
            <EuiFlexItem key={tag.id} grow={false}>
              <TagBadge tag={tag} />
            </EuiFlexItem>
          ))}
        </EuiFlexGroup>

        <EuiSpacer size="l" />

        <EuiText>
          <h3>Color Variations</h3>
        </EuiText>

        <EuiSpacer size="m" />

        <EuiFlexGroup wrap gutterSize="s">
          {[
            { name: 'Red', color: '#E74C3C' },
            { name: 'Orange', color: '#F39C12' },
            { name: 'Yellow', color: '#F1C40F' },
            { name: 'Green', color: '#27AE60' },
            { name: 'Blue', color: '#3498DB' },
            { name: 'Purple', color: '#9B59B6' },
            { name: 'Pink', color: '#E91E63' },
            { name: 'Teal', color: '#16A085' },
            { name: 'Gray', color: '#95A5A6' },
          ].map((color) => (
            <EuiFlexItem key={color.name} grow={false}>
              <TagBadge
                tag={{
                  id: color.name.toLowerCase(),
                  name: color.name,
                  description: `${color.name} color tag`,
                  color: color.color,
                  managed: false,
                }}
              />
            </EuiFlexItem>
          ))}
        </EuiFlexGroup>
      </div>
    );
  },
};

export const Playground: Story = {
  args: {
    tagName: 'Important',
    tagDescription: 'Mark items as important',
    tagColor: '#FF6B6B',
    managed: false,
    interactive: true,
  },
  render: (args) => {
    const tag: Tag = {
      id: 'demo-tag',
      name: args.tagName,
      description: args.tagDescription,
      color: args.tagColor,
      managed: args.managed,
    };

    return (
      <div>
        <TagBadge tag={tag} onClick={args.interactive ? action('onClick') : undefined} />

        <EuiSpacer size="l" />

        <EuiText size="s">
          <p>
            <strong>Interaction:</strong>{' '}
            {args.interactive ? 'Click to filter, Cmd/Ctrl+Click to exclude' : 'Display only'}
          </p>
        </EuiText>
      </div>
    );
  },
};
