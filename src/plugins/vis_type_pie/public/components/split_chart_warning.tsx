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

import React from 'react';

import { EuiLink, EuiCallOut } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage, I18nProvider } from '@kbn/i18n/react';
import { DocLinksStart } from 'src/core/public';

interface SplitChartWarningProps {
  docLinks: DocLinksStart;
}

export function SplitChartWarning({ docLinks }: SplitChartWarningProps) {
  const advancedSettingsLink = docLinks.links.management.visualizationSettings;

  return (
    <I18nProvider>
      <EuiCallOut
        title={i18n.translate('visTypePie.splitChartWarning.title', {
          defaultMessage: 'Warning',
        })}
        color="warning"
        iconType="help"
      >
        <FormattedMessage
          id="visTypePie.splitChartWarning.content"
          defaultMessage="The new charts library does not support split chart aggregation. Please enable the {link} advanced setting to use split chart aggregation."
          values={{
            link: (
              <EuiLink href={advancedSettingsLink} target="_blank" external>
                <FormattedMessage
                  id="visTypePie.splitChartWarning.link"
                  defaultMessage="Legacy charts library"
                />
              </EuiLink>
            ),
          }}
        />
      </EuiCallOut>
    </I18nProvider>
  );
}
