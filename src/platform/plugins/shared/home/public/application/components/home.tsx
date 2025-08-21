/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useState, useEffect } from 'react';
import { FormattedMessage } from '@kbn/i18n-react';
import { METRIC_TYPE } from '@kbn/analytics';
import { i18n } from '@kbn/i18n';
import { KibanaPageTemplate } from '@kbn/shared-ux-page-kibana-template';
import { OverviewPageFooter } from '@kbn/kibana-react-plugin/public';
import { HOME_APP_BASE_PATH } from '../../../common/constants';
import type {
  FeatureCatalogueEntry,
  FeatureCatalogueSolution,
  FeatureCatalogueCategory,
} from '../../services';
import { getServices } from '../kibana_services';
import { AddData } from './add_data';
import { ManageData } from './manage_data';
import { SolutionsSection } from './solutions_section';
import { Welcome } from './welcome';
import { HomeContentPanels } from '../panels/home_content_panels';

export const KEY_ENABLE_WELCOME = 'home:welcome:show';

export interface HomeProps {
  addBasePath: (url: string) => string;
  directories: FeatureCatalogueEntry[];
  solutions: FeatureCatalogueSolution[];
  localStorage: Storage;
  urlBasePath: string;
  hasUserDataView: () => Promise<boolean>;
  isCloudEnabled: boolean;
}

interface State {
  isLoading: boolean;
  isNewKibanaInstance: boolean;
  isWelcomeEnabled: boolean;
}

export const Home: React.FC<HomeProps> = (props) => {
  const [isLoading, setIsLoading] = useState(false);
  const [isNewKibanaInstance, setIsNewKibanaInstance] = useState(false);
  const [isWelcomeEnabled, setIsWelcomeEnabled] = useState(false);
  const [hasUserDataViews, setHasUserDataViews] = useState(false);

  useEffect(() => {
    const welcomeEnabled =
      !getServices().homeConfig.disableWelcomeScreen &&
      getServices().application.capabilities.navLinks.integrations &&
      props.localStorage.getItem(KEY_ENABLE_WELCOME) !== 'false';

    const bodyElement = document.querySelector('body')!;
    bodyElement.classList.add('isHomPage');

    setIsWelcomeEnabled(welcomeEnabled);
    setIsLoading(welcomeEnabled);

    const homeTitle = i18n.translate('home.breadcrumbs.homeTitle', { defaultMessage: 'Home' });
    getServices().chrome.setBreadcrumbs([{ text: homeTitle }]);

    fetchIsNewKibanaInstance();

    return () => {
      const bodyElement = document.querySelector('body')!;
      bodyElement.classList.remove('isHomPage');
    };
  }, [props.localStorage]);

  const fetchIsNewKibanaInstance = async () => {
    try {
      // Set a max-time on this query so we don't hang the page too long...
      // Worst case, we don't show the welcome screen when we should.
      setTimeout(() => {
        if (isLoading) {
          setIsWelcomeEnabled(false);
        }
      }, 10000);

      const hasUserIndexPattern = await props.hasUserDataView();
      setHasUserDataViews(hasUserIndexPattern);
      setIsNewKibanaInstance(!hasUserIndexPattern);
      setIsLoading(false);
    } catch (err) {
      setIsLoading(false);
    }
  };

  const skipWelcome = () => {
    props.localStorage.setItem(KEY_ENABLE_WELCOME, 'false');
    setIsWelcomeEnabled(false);
  };

  const findDirectoryById = (id: string) => {
    return props.directories.find((directory) => directory.id === id);
  };

  const getFeaturesByCategory = (category: FeatureCatalogueCategory) => {
    return props.directories
      .filter((directory) => directory.showOnHomePage && directory.category === category)
      .sort((directoryA, directoryB) => (directoryA.order ?? -1) - (directoryB.order ?? -1));
  };

  const renderNormal = () => {
    const { addBasePath, solutions, isCloudEnabled } = props;
    const { application, trackUiMetric } = getServices();
    const isDarkMode = getServices().theme?.getTheme().darkMode ?? false;
    const devTools = findDirectoryById('console');
    const manageDataFeatures = getFeaturesByCategory('admin');

    // Show card for console if none of the manage data plugins are available, most likely in OSS
    if (manageDataFeatures.length < 1 && devTools) {
      manageDataFeatures.push(devTools);
    }

    // Show AddData component first when data views exist, with no page header
    if (hasUserDataViews) {
      return (
        <KibanaPageTemplate data-test-subj="homeApp" pageHeader={undefined} panelled={false}>
          <AddData
            addBasePath={addBasePath}
            application={application}
            isDarkMode={isDarkMode}
            isCloudEnabled={isCloudEnabled}
            isCompact={true}
          />

          <KibanaPageTemplate.Section paddingSize="xl" aria-labelledby="homeContentPanels__title">
            <HomeContentPanels />
          </KibanaPageTemplate.Section>

          <SolutionsSection addBasePath={addBasePath} solutions={solutions} />

          <ManageData
            addBasePath={addBasePath}
            application={application}
            features={manageDataFeatures}
          />

          <OverviewPageFooter
            addBasePath={addBasePath}
            path={HOME_APP_BASE_PATH}
            onSetDefaultRoute={() => {
              trackUiMetric(METRIC_TYPE.CLICK, 'set_home_as_default_route');
            }}
            onChangeDefaultRoute={() => {
              trackUiMetric(METRIC_TYPE.CLICK, 'change_to_different_default_route');
            }}
          />
        </KibanaPageTemplate>
      );
    }

    // Default layout when no data views exist
    return (
      <KibanaPageTemplate
        data-test-subj="homeApp"
        pageHeader={{
          bottomBorder: true,
          pageTitle: (
            <h1>
              <FormattedMessage id="home.header.title" defaultMessage="Home" />
            </h1>
          ),
        }}
        panelled={false}
      >
        <KibanaPageTemplate.Section paddingSize="xl" aria-labelledby="homeContentPanels__title">
          <HomeContentPanels />
        </KibanaPageTemplate.Section>

        <SolutionsSection addBasePath={addBasePath} solutions={solutions} />

        <AddData
          addBasePath={addBasePath}
          application={application}
          isDarkMode={isDarkMode}
          isCloudEnabled={isCloudEnabled}
        />

        <ManageData
          addBasePath={addBasePath}
          application={application}
          features={manageDataFeatures}
        />

        <OverviewPageFooter
          addBasePath={addBasePath}
          path={HOME_APP_BASE_PATH}
          onSetDefaultRoute={() => {
            trackUiMetric(METRIC_TYPE.CLICK, 'set_home_as_default_route');
          }}
          onChangeDefaultRoute={() => {
            trackUiMetric(METRIC_TYPE.CLICK, 'change_to_different_default_route');
          }}
        />
      </KibanaPageTemplate>
    );
  };

  // For now, loading is just an empty page, as we'll show something
  // in 250ms, no matter what, and a blank page prevents an odd flicker effect.
  const renderLoading = () => {
    return '';
  };

  const renderWelcome = () => {
    return <Welcome onSkip={skipWelcome} urlBasePath={props.urlBasePath} />;
  };

  if (isWelcomeEnabled) {
    if (isLoading) {
      return renderLoading();
    }
    if (isNewKibanaInstance) {
      return renderWelcome();
    }
  }

  return renderNormal();
};
