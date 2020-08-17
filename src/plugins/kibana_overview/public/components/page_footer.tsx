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
import { EuiFlexGroup, EuiFlexItem, EuiButtonEmpty, EuiHorizontalRule } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n/react';

interface Props {
  findDirectoryById: (id: string) => FeatureCatalogueEntry | undefined;
}

export const PageFooter: FC<Props> = ({ findDirectoryById, navigateToApp }) => {
  const advancedSettings = findDirectoryById('advanced_settings');

  return (
    <footer>
      <EuiHorizontalRule margin="xl" aria-hidden="true" />

      <EuiFlexGroup
        className="homPageFooter"
        alignItems="center"
        gutterSize="s"
        justifyContent="spaceBetween"
      >
        <EuiFlexItem grow={false}>
          {advancedSettings ? (
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
          ) : null}
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
  );
};
