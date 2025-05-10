/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { type FC, type ReactNode } from 'react';
import { KibanaPageTemplate } from '@kbn/shared-ux-page-kibana-template';
import { EuiListGroup, EuiListGroupItemProps, EuiProvider } from '@elastic/eui';

interface PageTemplateProps {
  title: string;
  button?: ReactNode[];
  children: ReactNode;
}

export const PageTemplate: FC<PageTemplateProps> = ({ title, button, children }) => {
  const sidebarListGroup: EuiListGroupItemProps[] = [
    {
      label: 'Discover',
      isActive: true,
      iconType: 'discoverApp',
    },
    {
      label: 'Dashboard',
      iconType: 'dashboardApp',
    },
    {
      label: 'Visualize',
      iconType: 'visualizeApp',
    },
    {
      label: 'Settings',
      iconType: 'gear',
    },
  ];
  return (
    <EuiProvider>
      <KibanaPageTemplate>
        <KibanaPageTemplate.Sidebar>
          <EuiListGroup listItems={sidebarListGroup} color="primary" size="s" />
        </KibanaPageTemplate.Sidebar>
        <KibanaPageTemplate.Header pageTitle={title} rightSideItems={button} />
        <KibanaPageTemplate.Section>{children}</KibanaPageTemplate.Section>
      </KibanaPageTemplate>
    </EuiProvider>
  );
};
