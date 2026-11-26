/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import type { MouseEvent } from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import { action } from '@storybook/addon-actions';
import {
  EuiFlexGrid,
  EuiFlexItem,
  EuiIcon,
  EuiNotificationBadge,
  EuiPanel,
  EuiSpacer,
} from '@elastic/eui';
import { IconChartBar } from '@kbn/chart-icons';
import { PanelMessage } from '../panel_message';
import type { PanelMessageAction, PanelMessageProps, PanelMessageSeverity } from '../panel_message';

/** Logs the action. Stories have no router, so it also keeps links from navigating away. */
const logAction = (name: string) => (event: MouseEvent<HTMLElement>) => {
  event.preventDefault();
  action(name)();
};

const CHART_ICON = <EuiIcon type={IconChartBar} size="l" aria-hidden={true} />;
// Placeholder until the design illustration is available as an asset.
const CONTROLS_ICON = <EuiIcon type="controls" size="l" aria-hidden={true} />;

interface DesignState {
  /** The number of the state in the design. */
  readonly id: string;
  readonly props: PanelMessageProps;
}

const DESIGN_STATES: readonly DesignState[] = [
  {
    id: '1',
    props: {
      severity: 'warning',
      title: 'Data source not found',
      body: "Elasticsearch couldn't find logs-web. Check that data has arrived, that you have access to it, and that the query uses the right name.",
      onViewDetails: action('View details'),
    },
  },
  {
    id: '2',
    props: {
      severity: 'warning',
      title: 'Data view not found',
      body: "Kibana couldn't find logs-*. Edit the panel to use another data view.",
      onViewDetails: action('View details'),
    },
  },
  {
    id: '3',
    props: {
      severity: 'warning',
      title: 'Field not found',
      body: "Elasticsearch couldn't find host.name. Check that your data includes it, that you have access to it, and that the query uses the right name.",
      onViewDetails: action('View details'),
      primaryAction: { label: 'Edit visualization', onClick: logAction('Edit visualization') },
    },
  },
  {
    id: '4',
    props: {
      severity: 'info',
      title: 'No results found',
      body: 'Try a longer time range, or change the query or filters.',
      icon: CHART_ICON,
      primaryAction: {
        label: 'Search entire time range',
        onClick: logAction('Search entire time range'),
      },
    },
  },
  {
    id: '5',
    props: {
      severity: 'info',
      title: 'Waiting for a control value',
      body: 'Select a value for the host.name control to load this panel.',
      icon: CONTROLS_ICON,
    },
  },
  {
    id: '6',
    props: {
      severity: 'warning',
      title: 'Loading canceled',
      body: 'Reload this panel or refresh the dashboard to see its results.',
      primaryAction: { label: 'Reload panel', onClick: logAction('Reload panel') },
    },
  },
  {
    id: '7',
    props: {
      severity: 'warning',
      title: 'Panel took too long to load',
      body: 'Try a shorter time range or more specific filters, then refresh. You can also increase the Search Timeout advanced setting.',
      secondaryActions: [
        {
          label: 'Edit settings',
          onClick: logAction('Edit settings'),
          href: '#/management/kibana/settings',
        },
      ],
      primaryAction: { label: 'Refresh dashboard', onClick: logAction('Refresh dashboard') },
    },
  },
  {
    id: '7b',
    props: {
      severity: 'error',
      title: "Panel settings don't match the data",
      body: "The panel expects a field that isn't in the results. Edit the visualization to update its fields.",
      primaryAction: { label: 'Edit visualization', onClick: logAction('Edit visualization') },
    },
  },
  {
    id: '8',
    props: {
      severity: 'error',
      title: "Couldn't connect to Elasticsearch",
      body: 'Refresh to try again. If this keeps happening, contact your administrator.',
      primaryAction: { label: 'Refresh dashboard', onClick: logAction('Refresh dashboard') },
    },
  },
  {
    id: '9',
    props: {
      severity: 'warning',
      title: 'Memory limit reached',
      body: 'Elasticsearch stopped this query to avoid running out of memory. Try a shorter time range or more specific filters, or try again later.',
      primaryAction: { label: 'Refresh dashboard', onClick: logAction('Refresh dashboard') },
    },
  },
  {
    id: '10',
    props: {
      severity: 'error',
      title: "Panel query can't run",
      body: 'The query saved with this panel has an error. Edit the visualization to fix it.',
      onViewDetails: action('View details'),
      primaryAction: { label: 'Edit visualization', onClick: logAction('Edit visualization') },
    },
  },
  {
    id: '11',
    props: {
      severity: 'warning',
      title: 'No access to some data',
      body: "You don't have permission to read logs-web. Ask your administrator for access.",
      onViewDetails: action('View details'),
    },
  },
];

const meta: Meta = {
  title: 'Presentation/Panel message',
};

export default meta;

/** Every panel state from the design, in the same order and numbering. */
export const AllStates: StoryObj = {
  name: 'All states',
  parameters: { controls: { disable: true } },
  render: () => (
    // The plain background stands in for the dashboard panel that a message normally sits in.
    <EuiPanel color="plain" hasBorder={false} paddingSize="l" css={{ maxWidth: 1400 }}>
      <EuiFlexGrid columns={4} gutterSize="xl">
        {DESIGN_STATES.map(({ id, props }) => (
          <EuiFlexItem key={id} css={{ alignItems: 'center' }}>
            <EuiNotificationBadge color="subdued" size="m">
              {id}
            </EuiNotificationBadge>
            <EuiSpacer size="m" />
            <div css={{ width: '100%' }}>
              <PanelMessage {...props} />
            </div>
          </EuiFlexItem>
        ))}
      </EuiFlexGrid>
    </EuiPanel>
  ),
};

const PLAYGROUND_ICONS = {
  'Default for the severity': undefined,
  Chart: CHART_ICON,
  Controls: CONTROLS_ICON,
} as const;

interface PlaygroundArgs {
  severity: PanelMessageSeverity;
  title: string;
  body: string;
  icon: keyof typeof PLAYGROUND_ICONS;
  primaryActionLabel: string;
  primaryActionHref: string;
  secondaryActions: ReadonlyArray<Pick<PanelMessageAction, 'label' | 'href'>>;
  viewDetails: boolean;
  'data-test-subj': string;
  panelWidth: number;
  panelHeight: number;
}

const COMPONENT_PROPS = { category: 'PanelMessage props' } as const;
const STORY_ONLY = { category: 'Dashboard panel size (story only)' } as const;

/** A single message inside a panel-sized frame, with a control for every property. */
export const Playground: StoryObj<PlaygroundArgs> = {
  args: {
    severity: 'warning',
    title: 'Panel took too long to load',
    body: 'Try a shorter time range or more specific filters, then refresh. You can also increase the Search Timeout advanced setting.',
    icon: 'Default for the severity',
    primaryActionLabel: 'Refresh dashboard',
    primaryActionHref: '',
    secondaryActions: [{ label: 'Edit settings', href: '#/management/kibana/settings' }],
    viewDetails: false,
    'data-test-subj': 'panelMessage',
    panelWidth: 600,
    panelHeight: 300,
  },
  argTypes: {
    severity: {
      control: 'inline-radio',
      options: ['error', 'warning', 'info'],
      table: COMPONENT_PROPS,
    },
    title: { control: 'text', table: COMPONENT_PROPS },
    body: { control: 'text', table: COMPONENT_PROPS },
    icon: {
      control: 'select',
      options: Object.keys(PLAYGROUND_ICONS),
      description: 'Replaces the default icon for the severity.',
      table: COMPONENT_PROPS,
    },
    primaryActionLabel: {
      name: 'primaryAction.label',
      control: 'text',
      description: 'Leave empty to hide the button.',
      table: COMPONENT_PROPS,
    },
    primaryActionHref: {
      name: 'primaryAction.href',
      control: 'text',
      description: 'Renders the button as a link.',
      table: COMPONENT_PROPS,
    },
    secondaryActions: {
      control: 'object',
      description: 'A list of { label, href }. Rendered as links at the end of the body.',
      table: COMPONENT_PROPS,
    },
    viewDetails: {
      name: 'onViewDetails',
      control: 'boolean',
      description: 'Adds the "View details" link.',
      table: COMPONENT_PROPS,
    },
    'data-test-subj': { control: 'text', table: COMPONENT_PROPS },
    panelWidth: { control: { type: 'range', min: 100, max: 1200, step: 10 }, table: STORY_ONLY },
    panelHeight: { control: { type: 'range', min: 40, max: 800, step: 10 }, table: STORY_ONLY },
  },
  render: ({
    icon,
    primaryActionLabel,
    primaryActionHref,
    secondaryActions,
    viewDetails,
    panelWidth,
    panelHeight,
    ...props
  }) => (
    <EuiPanel
      hasBorder
      paddingSize="none"
      css={{ width: panelWidth, height: panelHeight, overflow: 'hidden' }}
    >
      <PanelMessage
        {...props}
        icon={PLAYGROUND_ICONS[icon]}
        primaryAction={
          primaryActionLabel
            ? {
                label: primaryActionLabel,
                href: primaryActionHref || undefined,
                onClick: logAction(primaryActionLabel),
              }
            : undefined
        }
        secondaryActions={secondaryActions.map(({ label, href }) => ({
          label,
          href: href || undefined,
          onClick: logAction(label),
        }))}
        onViewDetails={viewDetails ? action('View details') : undefined}
      />
    </EuiPanel>
  ),
};
