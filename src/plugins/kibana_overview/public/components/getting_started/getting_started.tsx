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
  EuiButton,
  EuiCard,
  EuiFlexGrid,
  EuiFlexGroup,
  EuiFlexItem,
  EuiIcon,
  EuiImage,
  EuiSpacer,
  EuiText,
  EuiTitle,
} from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n/react';
import { FeatureCatalogueEntry } from '../../../../../../src/plugins/home/public';
import { PLUGIN_ID } from '../../../common';
import { createAppNavigationHandler } from '../../app_navigation_handler';

interface Props {
  addBasePath: (path: string) => string;
  isDarkTheme: boolean;
  apps: FeatureCatalogueEntry[];
}

export const GettingStarted: FC<Props> = ({ addBasePath, isDarkTheme, apps }) => {
  const gettingStartedGraphicURL = `/plugins/${PLUGIN_ID}/assets/kibana_montage_${
    isDarkTheme ? 'dark' : 'light'
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
                id="kibana_overview.gettingStarted.title"
                defaultMessage="Getting started with Kibana"
              />
            </h2>
          </EuiTitle>

          <EuiSpacer size="m" />

          <EuiText>
            <p>
              <FormattedMessage
                defaultMessage="Kibana gives you the freedom to select the way you give shape to your data. With its interactive visualizations, start with one question and see where it leads you."
                id="kibana_overview.gettingStarted.description"
              />
            </p>
          </EuiText>

          <EuiSpacer size="xl" />

          <EuiFlexGrid className="kbnOverviewGettingStarted__apps" columns={2}>
            {apps.map(({ subtitle = '', icon, title }) => (
              <EuiFlexItem key={title}>
                <EuiCard
                  description={subtitle}
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
              id="kibana_overview.gettingStarted.addDataButtonLabel"
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
