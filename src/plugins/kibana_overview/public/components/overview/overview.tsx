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
import React, { FC, useState, useEffect } from 'react';
import {
  EuiTitle,
  EuiFlexGroup,
  EuiFlexItem,
  EuiImage,
  EuiText,
  EuiFlexGrid,
  EuiCard,
  EuiButton,
  EuiIcon,
  EuiSpacer,
  EuiHorizontalRule,
  EuiScreenReaderOnly,
  EuiButtonEmpty,
} from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n/react';
import { i18n } from '@kbn/i18n';
import { createAppNavigationHandler } from '../../app_navigation_handler';
import { getServices } from '../../kibana_services';

const apps = {
  dashboard: {
    title: 'Dashboard',
    description: i18n.translate('home.kibana.featureCatalogueDescription1', {
      defaultMessage: 'Analyze data in dashboards.',
    }),
    icon: 'dashboardApp',
    path: '/app/dashboards',
  },
  discover: {
    title: 'Discover',
    description: i18n.translate('home.kibana.featureCatalogueDescription2', {
      defaultMessage: 'Search and find insights.',
    }),
    icon: 'discoverApp',
    path: '/app/discover',
  },
  canvas: {
    title: 'Canvas',
    description: i18n.translate('home.kibana.featureCatalogueDescription3', {
      defaultMessage: 'Design pixel-perfect reports.',
    }),
    icon: 'canvasApp',
    path: '/app/canvas',
  },
  maps: {
    title: 'Maps',
    description: i18n.translate('home.kibana.featureCatalogueDescription4', {
      defaultMessage: 'Plot geographic data.',
    }),
    icon: 'gisApp',
    path: '/app/maps',
  },
  ml: {
    title: 'Machine Learning',
    description: i18n.translate('home.kibana.featureCatalogueDescription5', {
      defaultMessage: 'Model, predict, and detect.',
    }),
    icon: 'machineLearningApp',
    path: '/app/ml',
  },
  graph: {
    title: 'Graph',
    description: i18n.translate('home.kibana.featureCatalogueDescription6', {
      defaultMessage: 'Reveal patterns and relationships.',
    }),
    icon: 'graphApp',
    path: '/app/graph',
  },
};

export const Overview: FC = () => {
  const [isNewKibanaInstance, setNewKibanaInstance] = useState(false);

  const { addBasePath, indexPatternService, uiSettings } = getServices();
  const IS_DARK_THEME = uiSettings.get('theme:darkMode');

  useEffect(() => {
    const fetchIsNewKibanaInstance = async () => {
      const resp = await indexPatternService.getTitles();

      setNewKibanaInstance(resp.length === 0);
    };

    fetchIsNewKibanaInstance();
  }, [indexPatternService]);

  const renderGettingStarted = () => {
    const gettingStartedGraphicURL = IS_DARK_THEME
      ? '/plugins/home/assets/kibana_montage_dark_2x.png'
      : '/plugins/home/assets/kibana_montage_light_2x.png';

    return (
      <section aria-labelledby="homOverview__gettingStartedTitle">
        <EuiFlexGroup>
          <EuiFlexItem>
            <EuiTitle size="s">
              <h2 id="homOverview__gettingStartedTitle">
                <FormattedMessage
                  id="kibanaOverview.gettingStartedTitle"
                  defaultMessage="Getting started with Kibana"
                />
              </h2>
            </EuiTitle>

            <EuiSpacer size="m" />

            <EuiText>
              <p>
                <FormattedMessage
                  id="kibanaOverview.gettingStartedDescription"
                  defaultMessage="Kibana gives you the freedom to select the way you give shape to your data. With its interactive visualizations, start with one question and see where it leads you."
                />
              </p>
            </EuiText>

            <EuiSpacer size="m" />

            <EuiFlexGrid gutterSize="s" columns={2}>
              {Object.values(apps).map(({ title, description, icon }) => (
                <EuiFlexItem key={title}>
                  <EuiCard
                    layout="horizontal"
                    titleSize="xs"
                    titleElement="h3"
                    icon={<EuiIcon type={icon} size="m" />}
                    display="plain"
                    title={title}
                    description={description}
                  />
                </EuiFlexItem>
              ))}
            </EuiFlexGrid>
            <EuiButton
              fill
              iconType="plusInCircle"
              onClick={createAppNavigationHandler('app/management/kibana/indexPatterns')}
            >
              <FormattedMessage
                id="kibanaOverview.gettingStarted.addDataButtonLabel"
                defaultMessage="Begin by adding data"
              />
            </EuiButton>
          </EuiFlexItem>
          <EuiFlexItem>
            <EuiImage url={addBasePath(gettingStartedGraphicURL)} alt="" />
          </EuiFlexItem>
        </EuiFlexGroup>
      </section>
    );
  };

  const renderAppCard = (appId: string) => {
    const app = apps[appId];
    return (
      <EuiFlexItem key={appId}>
        <EuiCard
          title={app.title}
          titleSize="s"
          description={app.description}
          image={addBasePath(
            `/plugins/home/assets/kibana_${appId}_${IS_DARK_THEME ? 'dark' : 'light'}_2x.png`
          )}
          // isDisabled={!Boolean(directory)}
          href={addBasePath(app.path)}
          onClick={createAppNavigationHandler(app.path)}
          titleElement="h3"
        />
      </EuiFlexItem>
    );
  };

  const renderNormal = () => {
    const mainApps = ['dashboard', 'discover'];
    const otherApps = Object.keys(apps).filter((appId) => !mainApps.includes(appId));

    return (
      <>
        <section aria-labelledby="kibanaOveview__appsSectionTitle">
          <EuiScreenReaderOnly>
            <EuiTitle>
              <h2 id="kibanaOveview__appsSectionTitle">
                <FormattedMessage
                  id="kibanaOverview.appsSection.title"
                  defaultMessage="Explore these apps"
                />
              </h2>
            </EuiTitle>
          </EuiScreenReaderOnly>
          <EuiFlexGroup>{mainApps.map(renderAppCard)}</EuiFlexGroup>
          <EuiSpacer size="l" />
          <EuiFlexGroup>{otherApps.map(renderAppCard)}</EuiFlexGroup>
        </section>

        <EuiHorizontalRule margin="xl" aria-hidden="true" />

        <EuiFlexGroup>
          <EuiFlexItem grow={1}>
            <section aria-labelledby="kibanaOverview__kibanaNewsSectionTitle">
              <EuiTitle size="s">
                <h2 className="kibanaOverview__kibanaNewsSectionTitle">
                  <FormattedMessage
                    id="kibanaOverview.kibanaNews.title"
                    defaultMessage="Kibana news"
                  />
                </h2>
              </EuiTitle>
            </section>
          </EuiFlexItem>
          <EuiFlexItem grow={3}>
            <section aria-labelledby="kibanaOverview__doMoreSectionTitle">
              <EuiTitle size="s">
                <h2 className="kibanaOverview__doMoreSectionTitle">
                  <FormattedMessage
                    id="kibanaOverview.doMoreTitle"
                    defaultMessage="Do more with Elastic"
                  />
                </h2>
              </EuiTitle>
            </section>
          </EuiFlexItem>
        </EuiFlexGroup>
      </>
    );
  };

  return (
    <main className="kibanaOverviewWrapper" aria-labelledby="kibanaOverviewHeader__title">
      <header className="kibanaOverviewHeader">
        <div className="kibanaOverviewHeader__inner">
          <EuiFlexGroup>
            <EuiFlexItem grow={false}>
              <EuiIcon type="logoKibana" size="xxl" />
            </EuiFlexItem>
            <EuiFlexGroup gutterSize="none" direction="column">
              <EuiFlexItem>
                <EuiText>Visualize & analyze</EuiText>
              </EuiFlexItem>
              <EuiFlexItem>
                <EuiTitle size="l">
                  <h1 id="kibanaOverviewHeader__title">
                    <FormattedMessage
                      id="kibanaOverview.pageHeader.title"
                      defaultMessage="Kibana"
                    />
                  </h1>
                </EuiTitle>
              </EuiFlexItem>
            </EuiFlexGroup>
          </EuiFlexGroup>
        </div>
      </header>
      <div className="kibanaOverviewContent">
        <EuiSpacer size="l" />

        {isNewKibanaInstance ? renderGettingStarted() : renderNormal()}

        <footer>
          <EuiHorizontalRule margin="xl" aria-hidden="true" />

          <EuiFlexGroup
            className="kibanaOverviewPageFooter"
            alignItems="center"
            gutterSize="s"
            justifyContent="spaceBetween"
          >
            <EuiFlexItem grow={false}>
              <EuiButtonEmpty
                iconType="home"
                onClick={createAppNavigationHandler('/app/management/kibana/settings#defaultRoute')}
                size="xs"
              >
                <FormattedMessage
                  id="home.changeHomeRouteLink"
                  defaultMessage="Display a different page on log in"
                />
              </EuiButtonEmpty>
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <EuiButtonEmpty
                data-test-subj="allPlugins"
                href="#/feature_directory"
                size="xs"
                flush="right"
                iconType="apps"
              >
                <FormattedMessage
                  id="home.appDirectory.appDirectoryButtonLabel"
                  defaultMessage="View app directory"
                />
              </EuiButtonEmpty>
            </EuiFlexItem>
          </EuiFlexGroup>
        </footer>
      </div>
    </main>
  );
};
