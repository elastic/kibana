/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { snakeCase } from 'lodash';
import React, { FC, useState, useEffect } from 'react';
import {
  EuiCard,
  EuiFlexGroup,
  EuiFlexItem,
  EuiHorizontalRule,
  EuiScreenReaderOnly,
  EuiSpacer,
  EuiTitle,
  EuiLoadingSpinner,
} from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import { CoreStart } from '@kbn/core/public';
import { i18n } from '@kbn/i18n';
import {
  RedirectAppLinks,
  useKibana,
  KibanaPageTemplate,
  KibanaPageTemplateSolutionNavAvatar,
  KibanaPageTemplateProps,
  overviewPageActions,
  OverviewPageFooter,
} from '@kbn/kibana-react-plugin/public';
import { FetchResult } from '@kbn/newsfeed-plugin/public';
import {
  FeatureCatalogueEntry,
  FeatureCatalogueSolution,
  FeatureCatalogueCategory,
} from '@kbn/home-plugin/public';
import { PLUGIN_ID, PLUGIN_PATH } from '../../../common';
import { AppPluginStartDependencies } from '../../types';
import { AddData } from '../add_data';
import { ManageData } from '../manage_data';
import { NewsFeed } from '../news_feed';
import { METRIC_TYPE, trackUiMetric } from '../../lib/ui_metric';

const sortByOrder = (featureA: FeatureCatalogueEntry, featureB: FeatureCatalogueEntry) =>
  (featureA.order || Infinity) - (featureB.order || Infinity);

interface Props {
  newsFetchResult: FetchResult | null | void;
  solutions: FeatureCatalogueSolution[];
  features: FeatureCatalogueEntry[];
}

export const Overview: FC<Props> = ({ newsFetchResult, solutions, features }) => {
  const [isNewKibanaInstance, setNewKibanaInstance] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const {
    services: { http, docLinks, dataViews, share, uiSettings, application },
  } = useKibana<CoreStart & AppPluginStartDependencies>();
  const addBasePath = http.basePath.prepend;
  const IS_DARK_THEME = uiSettings.get('theme:darkMode');

  // Home does not have a locator implemented, so hard-code it here.
  const addDataHref = addBasePath('/app/integrations/browse');
  const devToolsHref = share.url.locators.get('CONSOLE_APP_LOCATOR')?.useUrl({});
  const managementHref = share.url.locators
    .get('MANAGEMENT_APP_LOCATOR')
    ?.useUrl({ sectionId: '' });

  const getFeaturesByCategory = (category: string) =>
    features
      .filter((feature) => feature.showOnHomePage && feature.category === category)
      .sort(sortByOrder);

  const getSolutionGraphicURL = (solutionId: string) =>
    `/plugins/kibanaReact/assets/solutions_${solutionId}.svg`;

  const findFeatureById = (featureId: string) => features.find(({ id }) => id === featureId);
  const kibanaApps = features.filter(({ solutionId }) => solutionId === 'kibana').sort(sortByOrder);
  const addDataFeatures = getFeaturesByCategory(FeatureCatalogueCategory.DATA);
  const manageDataFeatures = getFeaturesByCategory(FeatureCatalogueCategory.ADMIN);
  const devTools = findFeatureById('console');
  const noDataConfig: KibanaPageTemplateProps['noDataConfig'] = {
    solution: i18n.translate('kibanaOverview.noDataConfig.solutionName', {
      defaultMessage: `Analytics`,
    }),
    pageTitle: i18n.translate('kibanaOverview.noDataConfig.pageTitle', {
      defaultMessage: `Welcome to Analytics!`,
    }),
    logo: 'logoKibana',
    actions: {
      elasticAgent: {
        title: i18n.translate('kibanaOverview.noDataConfig.title', {
          defaultMessage: 'Add integrations',
        }),
        description: i18n.translate('kibanaOverview.noDataConfig.description', {
          defaultMessage:
            'Use Elastic Agent or Beats to collect data and build out Analytics solutions.',
        }),
        'data-test-subj': 'kbnOverviewAddIntegrations',
      },
    },
    docsLink: docLinks.links.kibana.guide,
  };

  // Show card for console if none of the manage data plugins are available, most likely in OSS
  if (manageDataFeatures.length < 1 && devTools) {
    manageDataFeatures.push(devTools);
  }

  useEffect(() => {
    const fetchIsNewKibanaInstance = async () => {
      const hasUserIndexPattern = await dataViews.hasUserDataView().catch(() => true);

      setNewKibanaInstance(!hasUserIndexPattern);
      setIsLoading(false);
    };

    fetchIsNewKibanaInstance();
  }, [dataViews]);

  const renderAppCard = (appId: string) => {
    const app = kibanaApps.find(({ id }) => id === appId);

    return app ? (
      <EuiFlexItem className="kbnOverviewApps__item" key={appId}>
        <RedirectAppLinks application={application}>
          <EuiCard
            description={app?.subtitle || ''}
            href={addBasePath(app.path)}
            onClick={() => {
              trackUiMetric(METRIC_TYPE.CLICK, `app_card_${appId}`);
            }}
            image={addBasePath(
              `/plugins/${PLUGIN_ID}/assets/kibana_${appId}_${IS_DARK_THEME ? 'dark' : 'light'}.svg`
            )}
            title={app.title}
            titleElement="h3"
            titleSize="s"
          />
        </RedirectAppLinks>
      </EuiFlexItem>
    ) : null;
  };

  // Dashboard and discover are displayed in larger cards
  const mainApps = ['dashboard', 'discover'];
  const remainingApps = kibanaApps.map(({ id }) => id).filter((id) => !mainApps.includes(id));

  if (isLoading) {
    return (
      <EuiFlexGroup justifyContent="center" alignItems="center">
        <EuiFlexItem grow={false}>
          <EuiLoadingSpinner size="xl" />
        </EuiFlexItem>
      </EuiFlexGroup>
    );
  }

  return (
    <KibanaPageTemplate
      pageHeader={{
        iconType: 'logoKibana',
        pageTitle: <FormattedMessage defaultMessage="Analytics" id="kibanaOverview.header.title" />,
        rightSideItems: overviewPageActions({
          addDataHref,
          application,
          devToolsHref,
          hidden: isNewKibanaInstance,
          managementHref,
          showDevToolsLink: !!devTools,
          showManagementLink: !!manageDataFeatures,
        }),
      }}
      noDataConfig={isNewKibanaInstance ? noDataConfig : undefined}
      template="empty"
    >
      <>
        <section aria-labelledby="kbnOverviewApps__title" className="kbnOverviewApps">
          <EuiScreenReaderOnly>
            <h2 id="kbnOverviewApps__title">
              <FormattedMessage
                id="kibanaOverview.apps.title"
                defaultMessage="Explore these apps"
              />
            </h2>
          </EuiScreenReaderOnly>

          {mainApps.length ? (
            <>
              <EuiFlexGroup
                className="kbnOverviewApps__group kbnOverviewApps__group--primary"
                justifyContent="center"
              >
                {mainApps.map(renderAppCard)}
              </EuiFlexGroup>

              <EuiSpacer size="l" />
            </>
          ) : null}

          {remainingApps.length ? (
            <EuiFlexGroup
              className="kbnOverviewApps__group kbnOverviewApps__group--secondary"
              justifyContent="center"
            >
              {remainingApps.map(renderAppCard)}
            </EuiFlexGroup>
          ) : null}
        </section>

        <EuiHorizontalRule aria-hidden="true" margin="xl" />

        <EuiFlexGroup
          alignItems="flexStart"
          className={`kbnOverviewSupplements ${
            newsFetchResult && newsFetchResult.feedItems.length
              ? 'kbnOverviewSupplements--hasNews'
              : 'kbnOverviewSupplements--noNews'
          }`}
        >
          {newsFetchResult && newsFetchResult.feedItems.length ? (
            <EuiFlexItem grow={1}>
              <NewsFeed newsFetchResult={newsFetchResult} />
            </EuiFlexItem>
          ) : null}

          <EuiFlexItem grow={3}>
            {solutions.length ? (
              <section aria-labelledby="kbnOverviewMore__title" className="kbnOverviewMore">
                <EuiTitle size="s">
                  <h2 id="kbnOverviewMore__title">
                    <FormattedMessage
                      id="kibanaOverview.more.title"
                      defaultMessage="Do more with Elastic"
                    />
                  </h2>
                </EuiTitle>

                <EuiSpacer size="m" />

                <EuiFlexGroup className="kbnOverviewMore__content">
                  {solutions.map(({ id, title, description, icon, path }) => (
                    <EuiFlexItem className="kbnOverviewMore__item" key={id}>
                      <RedirectAppLinks application={application}>
                        <EuiCard
                          className={`kbnOverviewSolution ${id}`}
                          description={description ? description : ''}
                          href={addBasePath(path)}
                          icon={
                            <KibanaPageTemplateSolutionNavAvatar
                              name={title}
                              iconType={icon}
                              size="xl"
                            />
                          }
                          image={addBasePath(getSolutionGraphicURL(snakeCase(id)))}
                          title={title}
                          titleElement="h3"
                          titleSize="xs"
                          onClick={() => {
                            trackUiMetric(METRIC_TYPE.CLICK, `solution_panel_${id}`);
                          }}
                        />
                      </RedirectAppLinks>
                    </EuiFlexItem>
                  ))}
                </EuiFlexGroup>
              </section>
            ) : (
              <EuiFlexGroup
                className={`kbnOverviewData ${
                  addDataFeatures.length === 1 && manageDataFeatures.length === 1
                    ? 'kbnOverviewData--compressed'
                    : 'kbnOverviewData--expanded'
                }`}
              >
                <EuiFlexItem>
                  <AddData addBasePath={addBasePath} features={addDataFeatures} />
                </EuiFlexItem>

                <EuiFlexItem>
                  <ManageData addBasePath={addBasePath} features={manageDataFeatures} />
                </EuiFlexItem>
              </EuiFlexGroup>
            )}
          </EuiFlexItem>
        </EuiFlexGroup>
      </>

      <EuiHorizontalRule margin="xl" aria-hidden="true" />

      <OverviewPageFooter
        addBasePath={addBasePath}
        path={PLUGIN_PATH}
        onSetDefaultRoute={() => {
          trackUiMetric(METRIC_TYPE.CLICK, 'set_kibana_overview_as_default_route');
        }}
        onChangeDefaultRoute={() => {
          trackUiMetric(METRIC_TYPE.CLICK, 'change_to_different_default_route');
        }}
      />
    </KibanaPageTemplate>
  );
};
