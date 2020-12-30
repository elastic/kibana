/*
 * Licensed to Elasticsearch B.V. under one or more contributor
 * license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright
 * ownership. Elasticsearch B.V. licenses this file to you under
 * the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
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
  EuiToken,
} from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n/react';
import { CoreStart } from 'kibana/public';
import {
  RedirectAppLinks,
  useKibana,
  OverviewPageFooter,
  OverviewPageHeader,
} from '../../../../../../src/plugins/kibana_react/public';
import { FetchResult } from '../../../../../../src/plugins/newsfeed/public';
import {
  FeatureCatalogueEntry,
  FeatureCatalogueSolution,
  FeatureCatalogueCategory,
} from '../../../../../../src/plugins/home/public';
import { PLUGIN_ID, PLUGIN_PATH } from '../../../common';
import { AppPluginStartDependencies } from '../../types';
import { AddData } from '../add_data';
import { GettingStarted } from '../getting_started';
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
  const {
    services: { http, data, uiSettings, application },
  } = useKibana<CoreStart & AppPluginStartDependencies>();
  const addBasePath = http.basePath.prepend;
  const indexPatternService = data.indexPatterns;
  const IS_DARK_THEME = uiSettings.get('theme:darkMode');

  const getFeaturesByCategory = (category: string) =>
    features
      .filter((feature) => feature.showOnHomePage && feature.category === category)
      .sort(sortByOrder);

  const getSolutionGraphicURL = (solutionId: string) =>
    `/plugins/${PLUGIN_ID}/assets/solutions_${solutionId}_${
      IS_DARK_THEME ? 'dark' : 'light'
    }_2x.png`;

  const findFeatureById = (featureId: string) => features.find(({ id }) => id === featureId);
  const kibanaApps = features.filter(({ solutionId }) => solutionId === 'kibana').sort(sortByOrder);
  const addDataFeatures = getFeaturesByCategory(FeatureCatalogueCategory.DATA);
  const manageDataFeatures = getFeaturesByCategory(FeatureCatalogueCategory.ADMIN);
  const devTools = findFeatureById('console');

  // Show card for console if none of the manage data plugins are available, most likely in OSS
  if (manageDataFeatures.length < 1 && devTools) {
    manageDataFeatures.push(devTools);
  }

  useEffect(() => {
    const fetchIsNewKibanaInstance = async () => {
      const resp = await indexPatternService.getTitles();

      setNewKibanaInstance(resp.length === 0);
    };

    fetchIsNewKibanaInstance();
  }, [indexPatternService]);

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

  return (
    <main aria-labelledby="kbnOverviewPageHeader__title" className="kbnOverviewWrapper">
      <OverviewPageHeader
        addBasePath={addBasePath}
        hideToolbar={isNewKibanaInstance}
        iconType="logoKibana"
        title={<FormattedMessage defaultMessage="Kibana" id="kibanaOverview.header.title" />}
      />

      <div className="kbnOverviewContent">
        {isNewKibanaInstance ? (
          <GettingStarted addBasePath={addBasePath} isDarkTheme={IS_DARK_THEME} apps={kibanaApps} />
        ) : (
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
                              className="kbnOverviewSolution"
                              description={description ? description : ''}
                              href={addBasePath(path)}
                              icon={
                                <EuiToken
                                  className="kbnOverviewSolution__icon"
                                  fill="light"
                                  iconType={icon}
                                  shape="circle"
                                  size="l"
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
        )}

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
      </div>
    </main>
  );
};
