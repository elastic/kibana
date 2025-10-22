/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useEffect } from 'react';

import {
  EuiPageTemplate,
  EuiSpacer,
  EuiTab,
  EuiTabs,
  type EuiPageTemplateProps,
} from '@elastic/eui';
import type { OverlayStart } from '@kbn/core/public';
import type { RenderingService } from '@kbn/core-rendering-browser';
import type { NavigationPublicPluginStart } from '@kbn/navigation-plugin/public';
import { BrowserRouter as Router } from '@kbn/shared-ux-router';
import { useHistory, useLocation } from 'react-router-dom';

import { FlyoutWithOverlays } from './_flyout_with_overlays';
import { FlyoutWithComponent } from './_flyout_with_component';

interface AppDeps {
  basename: string;
  navigation: NavigationPublicPluginStart;
  overlays: OverlayStart;
  rendering: RenderingService;
}

type AppContentDeps = Pick<AppDeps, 'overlays' | 'rendering'>;

// Tab constants
const FLYOUT_FROM_COMPONENTS = 'render_from_components';
const FLYOUT_WITH_OVERLAYS = 'render_with_overlays';

// Component that uses router hooks (must be inside Router context)
const AppContent: React.FC<AppContentDeps> = ({ overlays, rendering }) => {
  const panelled: EuiPageTemplateProps['panelled'] = undefined;
  const restrictWidth: EuiPageTemplateProps['restrictWidth'] = false;
  const bottomBorder: EuiPageTemplateProps['bottomBorder'] = 'extended';

  const history = useHistory();
  const location = useLocation();

  const [selectedTabId, setSelectedTabId] = React.useState(FLYOUT_FROM_COMPONENTS);

  // Initialize tab from URL on mount
  useEffect(() => {
    const searchParams = new URLSearchParams(location.search);
    const tabFromUrl = searchParams.get('tab');
    if (tabFromUrl && [FLYOUT_FROM_COMPONENTS, FLYOUT_WITH_OVERLAYS].includes(tabFromUrl)) {
      setSelectedTabId(tabFromUrl);
    }
  }, [location.search]);

  const handleTabClick = (tabId: string) => {
    setSelectedTabId(tabId);
    // Update URL with the selected tab
    const searchParams = new URLSearchParams(location.search);
    searchParams.set('tab', tabId);
    history.replace({ search: searchParams.toString() });
  };

  const renderTabContent = () => {
    switch (selectedTabId) {
      case FLYOUT_FROM_COMPONENTS:
        return <FlyoutWithComponent />;
      case FLYOUT_WITH_OVERLAYS:
        return <FlyoutWithOverlays overlays={overlays} />;
      default:
        return null;
    }
  };

  return (
    <EuiPageTemplate
      panelled={panelled}
      restrictWidth={restrictWidth}
      bottomBorder={bottomBorder}
      offset={0}
      grow={false}
    >
      <EuiPageTemplate.Header iconType="logoElastic" pageTitle="Flyout System Example" />
      <EuiPageTemplate.Section>
        <EuiTabs>
          <EuiTab
            isSelected={selectedTabId === FLYOUT_FROM_COMPONENTS}
            onClick={() => handleTabClick(FLYOUT_FROM_COMPONENTS)}
          >
            Render EuiFlyout component
          </EuiTab>
          <EuiTab
            isSelected={selectedTabId === FLYOUT_WITH_OVERLAYS}
            onClick={() => handleTabClick(FLYOUT_WITH_OVERLAYS)}
          >
            Render with overlays.openSystemFlyout
          </EuiTab>
        </EuiTabs>
        <EuiSpacer />
        {renderTabContent()}
      </EuiPageTemplate.Section>
    </EuiPageTemplate>
  );
};

// Main App component that provides Router context
export const App = ({ basename, navigation, overlays, rendering }: AppDeps) => {
  return (
    <Router basename={basename}>
      <navigation.ui.TopNavMenu
        appName="flyout_system_example"
        showSearchBar={false}
        useDefaultBehaviors={true}
      />
      <AppContent overlays={overlays} rendering={rendering} />
    </Router>
  );
};
