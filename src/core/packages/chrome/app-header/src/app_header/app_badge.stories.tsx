/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import { action } from '@storybook/addon-actions';
import {
  EuiBadge,
  EuiFlexGroup,
  EuiFlexItem,
  EuiHeader,
  EuiHeaderSection,
  EuiPageTemplate,
  EuiPopover,
  EuiTitle,
} from '@elastic/eui';
import type { AppHeaderBadge } from '../types';
import { AppBadge } from './app_badge';

const MAX_VISIBLE_BADGES = 2;
const OVERFLOW_THRESHOLD = 3;

interface AppBadgeStoryProps {
  title: string;
  badges: AppHeaderBadge[];
}

const HeaderWithBadges = ({ title, badges }: AppBadgeStoryProps) => {
  const [isPopoverOpen, setIsPopoverOpen] = useState(false);
  const shouldOverflow = badges.length > OVERFLOW_THRESHOLD;
  const visibleBadges = shouldOverflow ? badges.slice(0, MAX_VISIBLE_BADGES) : badges;
  const overflowBadges = shouldOverflow ? badges.slice(MAX_VISIBLE_BADGES) : [];

  return (
    <EuiHeader>
      <EuiHeaderSection>
        <EuiFlexGroup alignItems="center" gutterSize="s" responsive={false} wrap={false}>
          <EuiFlexItem grow={false}>
            <EuiTitle size="xs">
              <h1>{title}</h1>
            </EuiTitle>
          </EuiFlexItem>
          {visibleBadges.map((badge) => (
            <EuiFlexItem grow={false} key={badge.label}>
              <AppBadge badge={badge} />
            </EuiFlexItem>
          ))}
          {overflowBadges.length > 0 && (
            <EuiFlexItem grow={false}>
              <EuiPopover
                aria-label="More badges"
                button={
                  <EuiBadge
                    color="hollow"
                    onClick={() => setIsPopoverOpen((open) => !open)}
                    onClickAriaLabel={`Show ${overflowBadges.length} more badges`}
                  >
                    +{overflowBadges.length}
                  </EuiBadge>
                }
                isOpen={isPopoverOpen}
                closePopover={() => setIsPopoverOpen(false)}
                panelPaddingSize="s"
              >
                <EuiFlexGroup direction="column" gutterSize="xs" alignItems="center">
                  {overflowBadges.map((badge) => (
                    <EuiFlexItem grow={false} key={badge.label}>
                      <AppBadge badge={badge} />
                    </EuiFlexItem>
                  ))}
                </EuiFlexGroup>
              </EuiPopover>
            </EuiFlexItem>
          )}
        </EuiFlexGroup>
      </EuiHeaderSection>
    </EuiHeader>
  );
};

const meta: Meta<AppBadgeStoryProps> = {
  title: 'Chrome/App Badge',
  component: HeaderWithBadges,
  decorators: [
    (Story) => (
      <EuiPageTemplate>
        <Story />
      </EuiPageTemplate>
    ),
  ],
  parameters: {
    docs: {
      description: {
        component:
          'Badges displayed inline next to the page title in the Chrome header. ' +
          'Each badge can be a simple label, have a click handler, or open a context menu.',
      },
    },
  },
};

export default meta;

type Story = StoryObj<AppBadgeStoryProps>;

export const Badges: Story = {
  args: {
    title: '[Logs] Web Traffic',
    badges: [
      { label: 'Beta' },
      {
        label: 'Tech Preview',
        color: 'warning',
        tooltip: 'This feature is in tech preview and may change.',
        onClick: action('tech-preview-clicked'),
        onClickAriaLabel: 'Click to learn more about tech preview',
      },
      {
        label: 'Managed',
        color: 'primary',
        popoverWidth: 180,
        items: [
          {
            name: 'View details',
            icon: 'inspect',
            onClick: action('view-details-clicked'),
          },
          {
            name: 'Export',
            icon: 'exportAction',
            popoverWidth: 180,
            items: [
              {
                name: 'Export as CSV',
                icon: 'document',
                onClick: action('export-csv-clicked'),
              },
              {
                name: 'Export as JSON',
                icon: 'document',
                onClick: action('export-json-clicked'),
              },
            ],
          },
          {
            name: 'Unlink',
            icon: 'unlink',
            onClick: action('unlink-clicked'),
          },
        ],
      },
      { label: 'New', color: 'primary' },
    ],
  },
};

export const ThreeBadges: Story = {
  name: 'Three badges',
  args: {
    title: '[Logs] Web Traffic',
    badges: [
      { label: 'Beta' },
      {
        label: 'Tech Preview',
        color: 'warning',
        tooltip: 'This feature is in tech preview and may change.',
      },
      {
        label: 'Managed',
        color: 'primary',
        onClick: action('managed-clicked'),
        onClickAriaLabel: 'Click to view managed details',
      },
    ],
  },
};
