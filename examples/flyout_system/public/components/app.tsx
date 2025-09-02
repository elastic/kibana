/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';

import { BrowserRouter as Router } from '@kbn/shared-ux-router';
import { EuiText, EuiButton, EuiPageTemplate, type EuiPageTemplateProps } from '@elastic/eui';
import type { NavigationPublicPluginStart } from '@kbn/navigation-plugin/public';

interface AppDeps {
  basename: string;
  navigation: NavigationPublicPluginStart;
}

export const App = ({ basename, navigation }: AppDeps) => {
  const panelled: EuiPageTemplateProps['panelled'] = undefined;
  const restrictWidth: EuiPageTemplateProps['restrictWidth'] = false;
  const bottomBorder: EuiPageTemplateProps['bottomBorder'] = 'extended';

  return (
    <Router basename={basename}>
      <navigation.ui.TopNavMenu
        appName="flyout_system_example"
        showSearchBar={false}
        useDefaultBehaviors={true}
      />
      <EuiPageTemplate
        panelled={panelled}
        restrictWidth={restrictWidth}
        bottomBorder={bottomBorder}
        offset={0}
        grow={false}
      >
        <EuiPageTemplate.Header
          iconType="logoElastic"
          pageTitle="Page title"
          rightSideItems={[<EuiButton>Right side item</EuiButton>]}
          description="Header description."
          tabs={[{ label: 'Tab 1', isSelected: true }, { label: 'Tab 2' }]}
        />
        <EuiPageTemplate.Section>
          <EuiText>Hello 1234</EuiText>
        </EuiPageTemplate.Section>
      </EuiPageTemplate>
    </Router>
  );
};
