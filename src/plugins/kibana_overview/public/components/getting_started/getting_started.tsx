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
import { CoreStart } from 'kibana/public';
import { RedirectAppLinks, useKibana } from '../../../../../../src/plugins/kibana_react/public';
import { FeatureCatalogueEntry } from '../../../../../../src/plugins/home/public';
import { PLUGIN_ID } from '../../../common';

interface Props {
  addBasePath: (path: string) => string;
  isDarkTheme: boolean;
  apps: FeatureCatalogueEntry[];
}

export const GettingStarted: FC<Props> = ({ addBasePath, isDarkTheme, apps }) => {
  const {
    services: { application },
  } = useKibana<CoreStart>();
  const gettingStartedGraphicURL = `/plugins/${PLUGIN_ID}/assets/kibana_montage_${
    isDarkTheme ? 'dark' : 'light'
  }.svg`;

  return (
    <section
      aria-labelledby="kbnOverviewGettingStarted__title"
      className="kbnOverviewGettingStarted"
    >
      <EuiFlexGroup alignItems="center">
        <EuiFlexItem className="kbnOverviewGettingStarted__content">
          <div>
            <EuiTitle size="s">
              <h2 id="kbnOverviewGettingStarted__title">
                <FormattedMessage
                  id="kibanaOverview.gettingStarted.title"
                  defaultMessage="Getting started with Kibana"
                />
              </h2>
            </EuiTitle>

            <EuiSpacer size="m" />

            <EuiText>
              <p>
                <FormattedMessage
                  id="kibanaOverview.gettingStarted.description"
                  defaultMessage="Kibana empowers you to visualize your data, your way.  Start with one question, and see where the answer leads you."
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
                    icon={<EuiIcon color="text" size="l" type={icon} />}
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

            <RedirectAppLinks application={application}>
              <EuiButton
                fill
                iconType="indexOpen"
                href={addBasePath('/app/management/kibana/indexPatterns')}
              >
                <FormattedMessage
                  defaultMessage="Add your data"
                  id="kibanaOverview.gettingStarted.addDataButtonLabel"
                />
              </EuiButton>
            </RedirectAppLinks>
          </div>
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
