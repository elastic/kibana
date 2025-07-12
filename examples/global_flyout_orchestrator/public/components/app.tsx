/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/* eslint-disable no-console */

import React from 'react';

import { EuiPageTemplate, EuiSpacer, EuiTabbedContent, EuiTitle } from '@elastic/eui';
import { NavigationPublicPluginStart } from '@kbn/navigation-plugin/public';
import { BrowserRouter as Router } from '@kbn/shared-ux-router';
import { BasicFlyoutApp } from './basic';
import { DeepHistoryApp } from './deep_history';
import { ECommerceApp } from './ecommerce';
import { GroupOpenerApp } from './group_opener';

interface AppDeps {
  basename: string;
  navigation: NavigationPublicPluginStart;
}

export const App = ({ basename, navigation }: AppDeps) => {
  const tabs = [
    {
      id: 'advanced-history--id',
      name: 'Advanced Use Case',
      content: (
        <>
          <EuiSpacer />
          <ECommerceApp />
        </>
      ),
    },
    {
      id: 'deep-history--id',
      name: 'Deep History Navigation',
      content: (
        <>
          <EuiSpacer />
          <DeepHistoryApp />
        </>
      ),
    },
    {
      id: 'group-opener--id',
      name: 'Group Opener',
      content: (
        <>
          <EuiSpacer />
          <GroupOpenerApp />
        </>
      ),
    },
    {
      id: 'basic--id',
      name: 'Basic Flyout',
      content: (
        <>
          <EuiSpacer />
          <BasicFlyoutApp />
        </>
      ),
    },
  ];

  return (
    <Router basename={basename}>
      <navigation.ui.TopNavMenu
        appName="globalFlyoutOrchestratorExample"
        showSearchBar={false}
        useDefaultBehaviors={true}
      />
      <EuiPageTemplate restrictWidth="1000px">
        <EuiPageTemplate.Header>
          <EuiTitle size="l">
            <h1>Flyout System</h1>
          </EuiTitle>
        </EuiPageTemplate.Header>
        <EuiPageTemplate.Section>
          <EuiTabbedContent
            tabs={tabs}
            initialSelectedTab={tabs[0]}
            autoFocus="selected"
            onTabClick={(tab) => {
              console.log('clicked tab', tab);
            }}
          />
        </EuiPageTemplate.Section>
      </EuiPageTemplate>
    </Router>
  );
};
