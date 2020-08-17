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
import React, { FC } from 'react';
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
} from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n/react';
import { i18n } from '@kbn/i18n';
import { FeatureCatalogueEntry } from '../../../services';
import { getServices } from '../../kibana_services';
import { PageHeader } from '../page_header';
import { PageFooter } from '../page_footer';
import { createAppNavigationHandler } from '../app_navigation_handler';

const apps = [
  {
    title: 'Dashboard',
    description: i18n.translate('home.kibana.featureCatalogueDescription1', {
      defaultMessage: 'Analyze data in dashboards.',
    }),
    icon: 'dashboardApp',
  },
  {
    title: 'Discover',
    description: i18n.translate('home.kibana.featureCatalogueDescription2', {
      defaultMessage: 'Search and find insights.',
    }),
    icon: 'discoverApp',
  },
  {
    title: 'Canvas',
    description: i18n.translate('home.kibana.featureCatalogueDescription3', {
      defaultMessage: 'Design pixel-perfect reports.',
    }),
    icon: 'canvasApp',
  },
  {
    title: 'Maps',
    description: i18n.translate('home.kibana.featureCatalogueDescription4', {
      defaultMessage: 'Plot geographic data.',
    }),
    icon: 'gisApp',
  },
  {
    title: 'Machine Learning',
    description: i18n.translate('home.kibana.featureCatalogueDescription5', {
      defaultMessage: 'Model, predict, and detect.',
    }),
    icon: 'machineLearningApp',
  },
  {
    title: 'Graph',
    description: i18n.translate('home.kibana.featureCatalogueDescription6', {
      defaultMessage: 'Reveal patterns and relationships.',
    }),
    icon: 'graphApp',
  },
];

interface Props {
  addBasePath: (path: string) => string;
  isNewKibanaInstance: boolean;
  directories: FeatureCatalogueEntry[];
}

export const Overview: FC<Props> = ({ addBasePath, isNewKibanaInstance = true, directories }) => {
  const findDirectoryById = (id: string) => directories.find((directory) => directory.id === id);

  const renderGettingStarted = () => {
    const IS_DARK_THEME = getServices().uiSettings.get('theme:darkMode');
    const gettingStartedGraphicURL = IS_DARK_THEME
      ? '/plugins/home/assets/kibana_montage_dark_2x.png'
      : '/plugins/home/assets/kibana_montage_light_2x.png';

    return (
      <section>
        <EuiFlexGroup>
          <EuiFlexItem>
            <EuiTitle size="s">
              <h2>
                <FormattedMessage
                  id="home.overview.gettingStartedTitle"
                  defaultMessage="Getting started with Kibana"
                />
              </h2>
            </EuiTitle>

            <EuiSpacer size="m" />

            <EuiText>
              <p>
                <FormattedMessage
                  id="home.overview.gettingStartedDescription"
                  defaultMessage="Kibana gives you the freedom to select the way you give shape to your data. With its interactive visualizations, start with one question and see where it leads you."
                />
              </p>
            </EuiText>

            <EuiSpacer size="m" />

            <EuiFlexGrid gutterSize="s" columns={2}>
              {apps.map(({ title, description, icon }) => (
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
                id="home.overview.gettingStarted.addDataButtonLabel"
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
  const renderNormal = () => <section />;

  return (
    <main className="homPageContainer" aria-labelledby="homPageHeader__title">
      <PageHeader
        title={
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
                  <h1 id="homPageHeader__title">
                    <FormattedMessage id="home.overview.pageHeader.title" defaultMessage="Kibana" />
                  </h1>
                </EuiTitle>
              </EuiFlexItem>
            </EuiFlexGroup>
          </EuiFlexGroup>
        }
        findDirectoryById={findDirectoryById}
      />
      <div className="homPageMainContainer">
        <EuiSpacer size="l" />

        {isNewKibanaInstance ? renderGettingStarted() : renderNormal()}

        <EuiHorizontalRule margin="xl" aria-hidden="true" />

        <PageFooter findDirectoryById={findDirectoryById} />
      </div>
    </main>
  );
};
