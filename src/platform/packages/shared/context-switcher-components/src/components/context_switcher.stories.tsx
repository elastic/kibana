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
import { EuiAvatar, EuiBadge, EuiButtonEmpty, EuiPanel } from '@elastic/eui';

import { ContextSwitcher } from './context_switcher';
import type { SpaceItem, LinksListItem } from './types';

interface StoryArgs {
  searchThreshold: number;
}

const meta: Meta<StoryArgs> = {
  title: 'Context switcher',
  parameters: { layout: 'centered' },
  argTypes: {
    searchThreshold: {
      control: { type: 'number', min: 1, max: 15 },
      description: 'Number of spaces required to show the search box',
    },
  },
  args: {
    searchThreshold: 15,
  },
};

export default meta;
type Story = StoryObj<StoryArgs>;

const MOCK_SPACES: Array<SpaceItem> = [
  { id: 'default', name: 'Default', solution: 'Security', solutionIcon: 'logoSecurity' },
  {
    id: 'obs',
    name: 'My awesome space',
    solution: 'Observability',
    solutionIcon: 'logoObservability',
  },
  {
    id: 'search',
    name: 'One more space',
    solution: 'Elasticsearch',
    solutionIcon: 'logoElasticsearch',
  },
  { id: 'sec', name: 'Another awesome space', solution: 'Security', solutionIcon: 'logoSecurity' },
  {
    id: 'data',
    name: 'Data Insight Realm',
    solution: 'Elasticsearch',
    solutionIcon: 'logoElasticsearch',
  },
  {
    id: 'k',
    name: 'Knowledge Discovery',
    solution: 'Observability',
    solutionIcon: 'logoObservability',
  },
];

const MOCK_FOOTER_LINKS: LinksListItem[] = [
  {
    id: 'connection-details',
    label: 'Connection details',
    onClick: () => action('connection-details')(),
    iconType: 'plugs',
  },
  {
    id: 'manage-deployments',
    label: 'Manage deployments',
    onClick: () => action('manage-deployments')(),
    iconType: 'gear',
  },
  {
    id: 'invite-users',
    label: 'Invite users',
    href: 'https://example.com',
    iconType: 'user',
    external: true,
  },
];

const buildSpaceItems = (showBadges: boolean): SpaceItem[] =>
  MOCK_SPACES.map((s) => ({
    ...s,
    avatar: <EuiAvatar type="space" name={s.name} size="s" />,
    badge: showBadges ? (
      <EuiBadge color="hollow" iconType={s.solutionIcon}>
        {s.solution}
      </EuiBadge>
    ) : undefined,
  }));

const buildManageAction = () => (
  <EuiButtonEmpty size="s" onClick={action('manage-spaces')}>
    Manage
  </EuiButtonEmpty>
);

const useSpacesConfig = (showBadges: boolean, searchThreshold?: number) => {
  const [activeSpaceId, setActiveSpaceId] = useState('obs');
  const activeSpace = MOCK_SPACES.find((s) => s.id === activeSpaceId)!;
  return {
    active: activeSpace,
    items: buildSpaceItems(showBadges),
    onSelect: (spaceId: string) => {
      action('select-space')(spaceId);
      setActiveSpaceId(spaceId);
    },
    headerAction: buildManageAction(),
    footerAction: SPACES_FOOTER_ACTION,
    search: searchThreshold != null ? { threshold: searchThreshold } : undefined,
  };
};

const SPACES_FOOTER_ACTION = {
  id: 'create-space',
  label: 'Create space',
  onClick: () => action('create-space')(),
};

const CloudScenario = ({ searchThreshold }: { searchThreshold: number }) => {
  const spaces = useSpacesConfig(true, searchThreshold);

  return (
    <EuiPanel color="subdued" paddingSize="m" hasBorder hasShadow={false}>
      <ContextSwitcher
        spaces={spaces}
        environmentContext={{
          environmentType: 'deployment',
          name: 'My Favorite Deployment',
          submenuItems: [
            {
              id: 'manage-discovery-insights',
              label: 'Manage Discovery Insights',
              iconType: 'gear',
              onClick: () => action('manage-discovery-insights')(),
            },
            {
              id: 'view-all-deployments',
              label: 'View all deployments',
              iconType: 'grid',
              onClick: () => action('view-all-deployments')(),
            },
          ],
          submenuFooterAction: {
            id: 'create-deployment',
            label: 'Create deployment',
            onClick: () => action('create-deployment')(),
          },
        }}
        footerLinks={MOCK_FOOTER_LINKS}
      />
    </EuiPanel>
  );
};

const ServerlessScenario = ({ searchThreshold }: { searchThreshold: number }) => {
  const spaces = useSpacesConfig(false, searchThreshold);

  return (
    <EuiPanel color="subdued" paddingSize="m" hasBorder hasShadow={false}>
      <ContextSwitcher
        spaces={spaces}
        environmentContext={{
          environmentType: 'project',
          name: 'My Favorite Project',
          submenuItems: [
            {
              id: 'manage-insightful-analytics',
              label: 'Manage Insightful Analytics',
              iconType: 'gear',
              onClick: () => action('manage-insightful-analytics')(),
            },
            {
              id: 'view-all-projects',
              label: 'View all projects',
              iconType: 'grid',
              onClick: () => action('view-all-projects')(),
            },
          ],
          submenuFooterAction: {
            id: 'create-project',
            label: 'Create project',
            onClick: () => action('create-project')(),
          },
        }}
        footerLinks={MOCK_FOOTER_LINKS}
      />
    </EuiPanel>
  );
};

const SelfHostedScenario = ({ searchThreshold }: { searchThreshold: number }) => {
  const spaces = useSpacesConfig(true, searchThreshold);

  return (
    <EuiPanel color="subdued" paddingSize="m" hasBorder hasShadow={false}>
      <ContextSwitcher spaces={spaces} />
    </EuiPanel>
  );
};

export const CloudMode: Story = {
  render: (args) => <CloudScenario searchThreshold={args.searchThreshold} />,
};
export const ServerlessMode: Story = {
  render: (args) => <ServerlessScenario searchThreshold={args.searchThreshold} />,
};
export const SelfHostedMode: Story = {
  render: (args) => <SelfHostedScenario searchThreshold={args.searchThreshold} />,
};
