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
import { EuiFlexGroup, EuiFlexItem, EuiButtonEmpty } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n/react';
import { FeatureCatalogueEntry } from '../../../../../../src/plugins/home/public';
import { createAppNavigationHandler } from '../../app_navigation_handler';

interface Props {
  features: FeatureCatalogueEntry[];
}

export const PageFooter: FC<Props> = ({ features }) => {
  const findFeatureById = (featureId: string) => features.find(({ id }) => id === featureId);
  const advancedSettings = findFeatureById('advanced_settings');

  return (
    <footer className="kbnOverviewFooter">
      <EuiFlexGroup alignItems="center" justifyContent="spaceBetween">
        <EuiFlexItem grow={false}>
          {advancedSettings ? (
            <EuiButtonEmpty
              iconType="home"
              onClick={createAppNavigationHandler('/app/management/kibana/settings#defaultRoute')}
              size="xs"
            >
              <FormattedMessage
                id="kibana_overview.footer.changeHomeRouteLink"
                defaultMessage="Display a different page on log in"
              />
            </EuiButtonEmpty>
          ) : null}
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiButtonEmpty
            data-test-subj="allPlugins"
            onClick={createAppNavigationHandler('/app/home#/feature_directory')}
            size="xs"
            iconType="apps"
          >
            <FormattedMessage
              id="kibana_overview.footer.appDirectoryButtonLabel"
              defaultMessage="View app directory"
            />
          </EuiButtonEmpty>
        </EuiFlexItem>
      </EuiFlexGroup>
    </footer>
  );
};
