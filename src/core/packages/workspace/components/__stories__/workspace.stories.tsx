/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { ComponentMeta } from '@storybook/react';
import { action } from '@storybook/addon-actions';
import { Global, css } from '@emotion/react';
import { EuiCollapsibleNavBeta, EuiCollapsibleNavItemProps, EuiTitle } from '@elastic/eui';

import { WorkspaceProvider, createStore } from '@kbn/core-workspace-state';
import { Provider } from 'react-redux';
import { Workspace as WorkspaceComponent } from '../workspace';

export default {
  title: 'Workspace',
  description: 'Kibana Workspace',
  parameters: {},
} as ComponentMeta<typeof WorkspaceComponent>;

const styles = css`
  body.sb-show-main.sb-main-padded {
    padding: 0;
    overflow-x: hidden;
    min-width: 100%;
    min-height: 100%;
  }
`;

const renderGroup = (groupTitle: string, groupItems: EuiCollapsibleNavItemProps[]) => {
  return [
    {
      renderItem: () => (
        <EuiTitle
          size="xxxs"
          className="eui-textTruncate"
          css={({ euiTheme }) => ({
            marginTop: euiTheme.size.base,
            paddingBlock: euiTheme.size.xs,
            paddingInline: euiTheme.size.s,
          })}
        >
          <div>{groupTitle}</div>
        </EuiTitle>
      ),
    },
    ...groupItems,
  ];
};

const ExampleNavigation = () => (
  <>
    <EuiCollapsibleNavBeta.Body>
      <EuiCollapsibleNavBeta.Item
        title="Elasticsearch"
        icon="logoElasticsearch"
        isCollapsible={false}
        items={[
          { title: 'Get started', href: '#' },
          ...renderGroup('Explore', [
            {
              title: 'Discover',
              onClick: () => action('Discover')('clicked!'),
            },
            { title: 'Dashboards', href: '#' },
            { title: 'Visualize library', href: '#' },
          ]),
          {
            title: 'Machine learning',
            items: [
              { title: 'Anomaly detection', href: '#' },
              { title: 'Data frame analytics', href: '#' },
              {
                title: 'Sub group',
                items: [
                  { title: 'Sub item 1', href: '#' },
                  { title: 'Sub item 2', href: '#' },
                ],
              },
            ],
          },
          ...renderGroup('Content', [
            { title: 'Indices', href: '#' },
            { title: 'Transforms', href: '#' },
            { title: 'Indexing API', href: '#' },
          ]),
          ...renderGroup('Security', [{ title: 'API keys', href: '#' }]),
        ]}
      />
    </EuiCollapsibleNavBeta.Body>
    <EuiCollapsibleNavBeta.Footer>
      <EuiCollapsibleNavBeta.Item
        title="Recent"
        icon="clock"
        items={[
          { title: 'Lorem ipsum', icon: 'visMapRegion', href: '#' },
          { title: 'Consectetur cursus', icon: 'visPie', href: '#' },
          { title: 'Ultricies tellus', icon: 'visMetric', href: '#' },
        ]}
      />
      <EuiCollapsibleNavBeta.Item
        title="Developer tools"
        icon="editorCodeBlock"
        items={[
          { title: 'Console', href: '#' },
          { title: 'Search profiler', href: '#' },
          { title: 'Grok debugger', href: '#' },
          { title: 'Painless lab', href: '#' },
        ]}
      />
      <EuiCollapsibleNavBeta.Item
        title="Project settings"
        icon="gear"
        items={[
          {
            title: 'Management',
            items: [
              { title: 'Integrations', href: '#' },
              { title: 'Fleet', href: '#' },
              { title: 'Osquery', href: '#' },
              { title: 'Stack monitoring', href: '#' },
              { title: 'Stack management', href: '#' },
            ],
          },
          {
            title: 'Users and roles',
            href: '#',
            linkProps: { target: '_blank' },
          },
          {
            title: 'Performance',
            href: '#',
            linkProps: { target: '_blank' },
          },
          {
            title: 'Billing and subscription',
            href: '#',
            linkProps: { target: '_blank' },
          },
        ]}
      />
    </EuiCollapsibleNavBeta.Footer>
  </>
);

const ExampleApplication = () => (
  <div
    css={css`
      display: flex;
      flex-flow: column nowrap;
      flex-grow: 1;
      z-index: 0;
      position: relative;
    `}
  >
    <div
      css={css`
        height: 250vh;
        margin: 16px;
      `}
    >
      Application
    </div>
  </div>
);

const store = createStore();

export const Workspace = () => (
  <Provider store={store}>
    <WorkspaceProvider tools={[]}>
      <Global styles={styles} />
      <WorkspaceComponent>
        {{
          header: <WorkspaceComponent.Header breadcrumbs={[]} />,
          navigation: (
            <WorkspaceComponent.Navigation>
              <ExampleNavigation />
            </WorkspaceComponent.Navigation>
          ),
          application: (
            <WorkspaceComponent.Application colorMode="LIGHT">
              <ExampleApplication />
            </WorkspaceComponent.Application>
          ),
          toolbox: <WorkspaceComponent.Toolbox>Toolbox</WorkspaceComponent.Toolbox>,
          tool: <WorkspaceComponent.Tool />,
        }}
      </WorkspaceComponent>
    </WorkspaceProvider>
  </Provider>
);
