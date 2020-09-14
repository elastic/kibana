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

import { Moment } from 'moment';
import React, { FC, useState, useEffect } from 'react';
import { Observable } from 'rxjs';
import {
  EuiButton,
  EuiButtonEmpty,
  EuiCard,
  EuiFlexGrid,
  EuiFlexGroup,
  EuiFlexItem,
  EuiHorizontalRule,
  EuiIcon,
  EuiImage,
  EuiLink,
  EuiScreenReaderOnly,
  EuiSpacer,
  EuiText,
  EuiTitle,
  EuiToken,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n/react';
import { PLUGIN_ID } from '../../../common';
import { createAppNavigationHandler } from '../../app_navigation_handler';
import { getServices } from '../../kibana_services';
import { PageHeader } from '../page_header';

const apps = {
  dashboards: {
    id: 'dashboards',
    title: 'Dashboard',
    description: i18n.translate('kibana.overview.apps.featureCatalogueDescription1', {
      defaultMessage: 'Analyze data in dashboards.',
    }),
    icon: 'dashboardApp',
    path: '/app/dashboards',
  },
  discover: {
    id: 'discover',
    title: 'Discover',
    description: i18n.translate('kibana.overview.apps.featureCatalogueDescription2', {
      defaultMessage: 'Search and find insights.',
    }),
    icon: 'search',
    path: '/app/discover',
  },
  canvas: {
    id: 'canvas',
    title: 'Canvas',
    description: i18n.translate('kibana.overview.apps.featureCatalogueDescription3', {
      defaultMessage: 'Design pixel-perfect reports.',
    }),
    icon: 'canvasApp',
    path: '/app/canvas',
  },
  maps: {
    id: 'maps',
    title: 'Maps',
    description: i18n.translate('kibana.overview.apps.featureCatalogueDescription4', {
      defaultMessage: 'Plot geographic data.',
    }),
    icon: 'gisApp',
    path: '/app/maps',
  },
  ml: {
    id: 'ml',
    title: 'Machine Learning',
    description: i18n.translate('kibana.overview.apps.featureCatalogueDescription5', {
      defaultMessage: 'Model, predict, and detect.',
    }),
    icon: 'compute',
    path: '/app/ml',
  },
  graph: {
    id: 'graph',
    title: 'Graph',
    description: i18n.translate('kibana.overview.apps.featureCatalogueDescription6', {
      defaultMessage: 'Reveal patterns and relationships.',
    }),
    icon: 'graphApp',
    path: '/app/graph',
  },
};

const solutions = {
  enterpriseSearch: {
    id: 'enterprise_search',
    title: 'Enterprise Search',
    description:
      'Build a leading search experience using a refined set of APIs and powerful search-based UI.',
    icon: 'logoEnterpriseSearch',
  },
  observability: {
    id: 'observability',
    title: 'Observability',
    description:
      'Consolidate your logs, metrics, application traces, and system availability with purpose-built UIs.',
    icon: 'logoObservability',
  },
  securitySolution: {
    id: 'security_solution',
    title: 'Security',
    description:
      'Combine network and host data integrations, sharable analytics, and explore your security data.',
    icon: 'logoSecurity',
  },
};

interface FeedItem {
  title: string;
  description: string;
  link: string;
  publishOn: Moment;
}

interface FetchResult {
  feedItems: FeedItem[];
}

interface Props {
  newsfeed$: Observable<FetchResult | null | void>;
}

export const Overview: FC<Props> = ({ newsfeed$ }) => {
  const [isNewKibanaInstance, setNewKibanaInstance] = useState(false);
  const [newsFetchResult, setNewsFetchResult] = useState<FetchResult | null | void>(null);
  const { addBasePath, application, indexPatternService, uiSettings } = getServices();
  const { capabilities } = application;
  const IS_DARK_THEME = uiSettings.get('theme:darkMode');

  const getSolutionGraphicURL = (solutionId: string) =>
    `/plugins/${PLUGIN_ID}/assets/solutions_${solutionId}_${
      IS_DARK_THEME ? 'dark' : 'light'
    }_2x.png`;

  useEffect(() => {
    function handleStatusChange(fetchResult: FetchResult | void | null) {
      setNewsFetchResult(fetchResult);
    }

    const subscription = newsfeed$.subscribe((res: FetchResult | void | null) => {
      handleStatusChange(res);
    });
    return () => subscription.unsubscribe();
  }, [newsfeed$]);

  useEffect(() => {
    const fetchIsNewKibanaInstance = async () => {
      const resp = await indexPatternService.getTitles();

      setNewKibanaInstance(resp.length === 0);
    };

    fetchIsNewKibanaInstance();
  }, [indexPatternService]);

  const renderGettingStarted = () => {
    const gettingStartedGraphicURL = `/plugins/${PLUGIN_ID}/assets/kibana_montage_${
      IS_DARK_THEME ? 'dark' : 'light'
    }_2x.png`;

    return (
      <section
        aria-labelledby="kbnOverviewGettingStarted__title"
        className="kbnOverviewGettingStarted"
      >
        <EuiFlexGroup alignItems="center">
          <EuiFlexItem className="kbnOverviewGettingStarted__content">
            <EuiTitle size="s">
              <h2 id="kbnOverviewGettingStarted__title">
                <FormattedMessage
                  id="kibana.overview.gettingStarted.title"
                  defaultMessage="Getting started with Kibana"
                />
              </h2>
            </EuiTitle>

            <EuiSpacer size="m" />

            <EuiText>
              <p>
                <FormattedMessage
                  defaultMessage="Kibana gives you the freedom to select the way you give shape to your data. With its interactive visualizations, start with one question and see where it leads you."
                  id="kibana.overview.gettingStarted.description"
                />
              </p>
            </EuiText>

            <EuiSpacer size="xl" />

            <EuiFlexGrid className="kbnOverviewGettingStarted__apps" columns={2}>
              {Object.values(apps).map(({ description, icon, title }) => (
                <EuiFlexItem key={title}>
                  <EuiCard
                    description={description}
                    display="plain"
                    icon={<EuiIcon size="l" type={icon} />}
                    layout="horizontal"
                    paddingSize="none"
                    title={title}
                    titleElement="h3"
                    titleSize="xs"
                  />
                </EuiFlexItem>
              ))}
            </EuiFlexGrid>

            <EuiSpacer size="xl" />

            <EuiButton
              fill
              iconType="indexOpen"
              onClick={createAppNavigationHandler('/app/management/kibana/indexPatterns')}
            >
              <FormattedMessage
                defaultMessage="Begin by adding data"
                id="kibana.overview.gettingStarted.addDataButtonLabel"
              />
            </EuiButton>
          </EuiFlexItem>

          <EuiFlexItem className="kbnOverviewGettingStarted__graphic">
            <EuiImage
              alt="Kibana visualizations illustration"
              url={addBasePath(gettingStartedGraphicURL)}
            />
          </EuiFlexItem>
        </EuiFlexGroup>
      </section>
    );
  };

  const renderFeedItem = ({ title, description, link, publishOn }: FeedItem) => (
    <article key={title}>
      <header>
        <EuiTitle size="xxs">
          <h3>
            <EuiLink href={link} target="_blank">
              {title}
            </EuiLink>
          </h3>
        </EuiTitle>

        <EuiText size="xs" color="subdued">
          <p>
            <time dateTime={publishOn.format('YYYY-MM-DD')}>
              {publishOn.format('DD MMMM YYYY')}
            </time>
          </p>
        </EuiText>
      </header>

      <EuiText size="xs">
        <p>{description}</p>
      </EuiText>
    </article>
  );

  const renderAppCard = (appId: string) => {
    const app = apps[appId];

    return capabilities.navLinks[appId] ? (
      <EuiFlexItem className="kbnOverviewApps__item" key={appId}>
        <EuiCard
          description={app.description}
          href={addBasePath(app.path)}
          image={addBasePath(
            `/plugins/${PLUGIN_ID}/assets/kibana_${appId}_${
              IS_DARK_THEME ? 'dark' : 'light'
            }_2x.png`
          )}
          // isDisabled={!capabilities.navLinks[appId]}
          onClick={createAppNavigationHandler(app.path)}
          title={app.title}
          titleElement="h3"
          titleSize="s"
        />
      </EuiFlexItem>
    ) : null;
  };

  const renderNormal = () => {
    const mainApps = ['dashboards', 'discover'];
    const otherApps = Object.keys(apps).filter((appId) => !mainApps.includes(appId));

    return (
      <>
        <section aria-labelledby="kbnOverviewApps__title" className="kbnOverviewApps">
          <EuiScreenReaderOnly>
            <h2 id="kbnOverviewApps__title">
              <FormattedMessage
                id="kibana.overview.apps.title"
                defaultMessage="Explore these apps"
              />
            </h2>
          </EuiScreenReaderOnly>

          <EuiFlexGroup
            className="kbnOverviewApps__group kbnOverviewApps__group--primary"
            justifyContent="center"
          >
            {mainApps.map(renderAppCard)}
          </EuiFlexGroup>

          <EuiSpacer size="l" />

          <EuiFlexGroup
            className="kbnOverviewApps__group kbnOverviewApps__group--secondary"
            justifyContent="center"
          >
            {otherApps.map(renderAppCard)}
          </EuiFlexGroup>
        </section>

        <EuiHorizontalRule aria-hidden="true" margin="xl" />

        <EuiFlexGroup>
          <EuiFlexItem grow={1}>
            <section aria-labelledby="kbnOverviewNews__title" className="kbnOverviewNews">
              <EuiTitle size="s">
                <h2 id="kbnOverviewNews__title">
                  <FormattedMessage id="kibana.overview.news.title" defaultMessage="Kibana news" />
                </h2>
              </EuiTitle>

              <EuiSpacer size="m" />

              <div className="kbnOverviewNews__content">
                {newsFetchResult ? newsFetchResult.feedItems.slice(0, 3).map(renderFeedItem) : null}
              </div>
            </section>
          </EuiFlexItem>

          <EuiFlexItem grow={3}>
            <section aria-labelledby="kbnOverviewMore__title" className="kbnOverviewMore">
              <EuiTitle size="s">
                <h2 id="kbnOverviewMore__title">
                  <FormattedMessage
                    id="kibana.overview.more.title"
                    defaultMessage="Do more with Elastic"
                  />
                </h2>
              </EuiTitle>

              <EuiSpacer size="m" />

              <EuiFlexGroup>
                {Object.values(solutions).map(({ id, title, description, icon }) => (
                  <EuiFlexItem key={id}>
                    <EuiCard
                      title={
                        <EuiTitle size="s">
                          <h3>{title}</h3>
                        </EuiTitle>
                      }
                      description={<span>{description}</span>}
                      icon={
                        <EuiToken
                          iconType={icon}
                          shape="circle"
                          fill="light"
                          size="l"
                          className="homSolutionPanel__icon"
                        />
                      }
                      image={<EuiImage url={addBasePath(getSolutionGraphicURL(id))} alt={title} />}
                    />
                  </EuiFlexItem>
                ))}
              </EuiFlexGroup>
            </section>
          </EuiFlexItem>
        </EuiFlexGroup>
      </>
    );
  };

  return (
    <main aria-labelledby="kbnOverviewHeader__title" className="kbnOverviewWrapper">
      <PageHeader />

      <div className="kbnOverviewContent">
        {isNewKibanaInstance ? renderGettingStarted() : renderNormal()}

        <EuiHorizontalRule margin="xl" aria-hidden="true" />

        <footer className="kbnOverviewFooter">
          <EuiFlexGroup alignItems="center" justifyContent="spaceBetween">
            <EuiFlexItem grow={false}>
              <EuiButtonEmpty
                iconType="home"
                onClick={createAppNavigationHandler('/app/management/kibana/settings#defaultRoute')}
                size="xs"
              >
                <FormattedMessage
                  id="kibana.overview.footer.changeHomeRouteLink"
                  defaultMessage="Display a different page on log in"
                />
              </EuiButtonEmpty>
            </EuiFlexItem>

            <EuiFlexItem grow={false}>
              <EuiButtonEmpty
                data-test-subj="allPlugins"
                href="#/feature_directory"
                size="xs"
                iconType="apps"
              >
                <FormattedMessage
                  id="kibana.overview.footer.appDirectoryButtonLabel"
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
