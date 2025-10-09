/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useCallback, useState, useEffect } from 'react';

import {
  EuiButton,
  EuiDescriptionList,
  EuiFlyout,
  EuiFlyoutBody,
  EuiPageTemplate,
  EuiSpacer,
  EuiSwitch,
  EuiTab,
  EuiTabs,
  EuiText,
  type EuiPageTemplateProps,
} from '@elastic/eui';
import type { OverlayStart } from '@kbn/core/public';
import type { RenderingService } from '@kbn/core-rendering-browser';
import type { NavigationPublicPluginStart } from '@kbn/navigation-plugin/public';
import { BrowserRouter as Router } from '@kbn/shared-ux-router';
import { useHistory, useLocation } from 'react-router-dom';

import { FlyoutWithIsOpen } from './_flyout_with_isopen';
import { FlyoutWithOverlays } from './_flyout_with_overlays';
import { FlyoutWithoutIsOpen } from './_flyout_without_isopen';

interface AppDeps {
  basename: string;
  navigation: NavigationPublicPluginStart;
  overlays: OverlayStart;
  rendering: RenderingService;
}

type AppContentDeps = Pick<AppDeps, 'overlays' | 'rendering'>;

interface FlyoutSessionProps {
  title: string;
  mainSize: 's' | 'm' | 'l' | 'fill';
  mainMaxWidth?: number;
  childSize?: 's' | 'm' | 'fill';
  childMaxWidth?: number;
  flyoutType: 'overlay' | 'push';
  childBackgroundShaded?: boolean;
}

const FlyoutSession: React.FC<FlyoutSessionProps> = React.memo((props) => {
  const { title, mainSize, childSize, mainMaxWidth, childMaxWidth, flyoutType } = props;

  const [isFlyoutVisible, setIsFlyoutVisible] = useState(false);
  const [isChildFlyoutVisible, setIsChildFlyoutVisible] = useState(false);

  // Handlers for "Open" buttons

  const handleOpenMainFlyout = () => {
    setIsFlyoutVisible(true);
  };

  const handleOpenChildFlyout = () => {
    setIsChildFlyoutVisible(true);
  };

  // Callbacks for state synchronization

  const mainFlyoutOnActive = useCallback(() => {
    console.log('activate main flyout', title); // eslint-disable-line no-console
  }, [title]);

  const childFlyoutOnActive = useCallback(() => {
    console.log('activate child flyout', title); // eslint-disable-line no-console
  }, [title]);

  const mainFlyoutOnClose = useCallback(() => {
    console.log('close main flyout', title); // eslint-disable-line no-console
    setIsFlyoutVisible(false);
    setIsChildFlyoutVisible(false);
  }, [title]);

  const childFlyoutOnClose = useCallback(() => {
    console.log('close child flyout', title); // eslint-disable-line no-console
    setIsChildFlyoutVisible(false);
  }, [title]);

  // Render

  return (
    <>
      <EuiText>
        <EuiButton disabled={isFlyoutVisible} onClick={handleOpenMainFlyout}>
          Open {title}
        </EuiButton>
      </EuiText>
      <EuiFlyout
        id={`mainFlyout-${title}`}
        session={true}
        isOpen={isFlyoutVisible}
        flyoutMenuProps={{ title: `${title} - Main` }}
        aria-labelledby="flyoutTitle"
        size={mainSize}
        maxWidth={mainMaxWidth}
        type={flyoutType}
        ownFocus={false}
        pushAnimation={true}
        onActive={mainFlyoutOnActive}
        onClose={mainFlyoutOnClose}
      >
        <EuiFlyoutBody>
          <EuiText>
            <p>This is the content of {title}.</p>
            <EuiSpacer size="s" />
            <EuiDescriptionList
              type="column"
              listItems={[
                { title: 'Flyout type', description: flyoutType },
                { title: 'Main flyout size', description: mainSize },
                {
                  title: 'Main flyout maxWidth',
                  description: mainMaxWidth ?? 'N/A',
                },
              ]}
            />
            {childSize && (
              <EuiButton onClick={handleOpenChildFlyout} disabled={isChildFlyoutVisible}>
                Open child flyout
              </EuiButton>
            )}
          </EuiText>
        </EuiFlyoutBody>
        {childSize && (
          <EuiFlyout
            id={`childFlyout-${title}`}
            isOpen={isChildFlyoutVisible}
            flyoutMenuProps={{ title: `${title} - Child` }}
            aria-labelledby="childFlyoutTitle"
            size={childSize}
            maxWidth={childMaxWidth}
            onActive={childFlyoutOnActive}
            onClose={childFlyoutOnClose}
          >
            <EuiFlyoutBody>
              <EuiText>
                <p>This is the content of the child flyout of {title}.</p>
                <EuiSpacer size="s" />
                <EuiDescriptionList
                  type="column"
                  listItems={[
                    {
                      title: 'Child flyout size',
                      description: childSize ?? 'N/A',
                    },
                    {
                      title: 'Child flyout maxWidth',
                      description: childMaxWidth ?? 'N/A',
                    },
                  ]}
                />
              </EuiText>
            </EuiFlyoutBody>
          </EuiFlyout>
        )}
      </EuiFlyout>
    </>
  );
});

FlyoutSession.displayName = 'FlyoutSession';

// Tab constants
const FLYOUT_WITH_ISOPEN = 'render_with_isopen';
const FLYOUT_WITHOUT_ISOPEN = 'render_without_isopen';
const FLYOUT_WITH_OVERLAYS = 'render_with_overlays';

// Component that uses router hooks (must be inside Router context)
const AppContent: React.FC<AppContentDeps> = ({ overlays, rendering }) => {
  const panelled: EuiPageTemplateProps['panelled'] = undefined;
  const restrictWidth: EuiPageTemplateProps['restrictWidth'] = false;
  const bottomBorder: EuiPageTemplateProps['bottomBorder'] = 'extended';

  const history = useHistory();
  const location = useLocation();

  const [flyoutType, setFlyoutType] = React.useState<'overlay' | 'push'>('overlay');
  const [childBackgroundShaded, setChildBackgroundShaded] = React.useState(false);
  const [selectedTabId, setSelectedTabId] = React.useState(FLYOUT_WITH_ISOPEN);

  // Initialize tab from URL on mount
  useEffect(() => {
    const searchParams = new URLSearchParams(location.search);
    const tabFromUrl = searchParams.get('tab');
    if (
      tabFromUrl &&
      [FLYOUT_WITH_ISOPEN, FLYOUT_WITHOUT_ISOPEN, FLYOUT_WITH_OVERLAYS].includes(tabFromUrl)
    ) {
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
      case FLYOUT_WITH_ISOPEN:
        return <FlyoutWithIsOpen flyoutType={flyoutType} />;
      case FLYOUT_WITHOUT_ISOPEN:
        return <FlyoutWithoutIsOpen flyoutType={flyoutType} />;
      case FLYOUT_WITH_OVERLAYS:
        return (
          <FlyoutWithOverlays overlays={overlays} rendering={rendering} flyoutType={flyoutType} />
        );
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
      <EuiPageTemplate.Section grow={false} bottomBorder={bottomBorder}>
        <EuiSwitch
          label="Flyouts push content"
          checked={flyoutType === 'push'}
          onChange={(e) => setFlyoutType(e.target.checked ? 'push' : 'overlay')}
        />
        <EuiSpacer />
        <EuiSwitch
          label="Child flyout background shaded"
          checked={childBackgroundShaded}
          onChange={(e) => setChildBackgroundShaded(e.target.checked)}
        />
      </EuiPageTemplate.Section>
      <EuiPageTemplate.Section>
        <EuiTabs>
          <EuiTab
            isSelected={selectedTabId === FLYOUT_WITH_ISOPEN}
            onClick={() => handleTabClick(FLYOUT_WITH_ISOPEN)}
          >
            Render EuiFlyout with isOpen prop
          </EuiTab>
          <EuiTab
            isSelected={selectedTabId === FLYOUT_WITHOUT_ISOPEN}
            onClick={() => handleTabClick(FLYOUT_WITHOUT_ISOPEN)}
          >
            Render EuiFlyout without isOpen prop
          </EuiTab>
          <EuiTab
            isSelected={selectedTabId === FLYOUT_WITH_OVERLAYS}
            onClick={() => handleTabClick(FLYOUT_WITH_OVERLAYS)}
          >
            Render with overlays.openFlyout
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
