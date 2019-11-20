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
import { i18n } from '@kbn/i18n';
import { I18nProvider, FormattedMessage } from '@kbn/i18n/react';
import { EuiIcon, EuiI18n, EuiLink } from '@elastic/eui';

export interface Props {
  showLinkToVisualize: boolean;
  onLinkClick: () => void;
}

export function DashboardEmptyScreen({ showLinkToVisualize, onLinkClick }: Props) {
  const fillDashboardTitle = i18n.translate('kbn.dashboard.fillDashboardTitle', {
    defaultMessage: 'This dashboard is empty. Let\u2019s fill it up!',
  });
  const visualizeAppLinkTest = i18n.translate('kbn.dashboard.visitVisualizeAppLinkText', {
    defaultMessage: 'visit the Visualize app',
  });
  const linkToVisualizeParagraph = (
    <p className="linkToVisualizeParagraph">
      <FormattedMessage
        id="kbn.dashboard.addVisualizationDescription3'"
        defaultMessage="If you haven't set up any visualizations yet, {visualizeAppLink} to create your first visualization"
        values={{
          visualizeAppLink: (
            <a className="euiLink" href="#/visualize">
              {visualizeAppLinkTest}
            </a>
          ),
        }}
      />
    </p>
  );
  const addVisualizationParagraph = (
    <React.Fragment>
      <p>
        <EuiI18n
          tokens={[
            'kbn.dashboard.addVisualizationDescription1',
            'kbn.dashboard.addVisualizationDescription2',
            'kbn.dashboard.addVisualizationLinkText',
            'kbn.dashboard.addVisualizationLinkAriaLabel',
          ]}
          defaults={[
            'Click the ',
            ' button in the menu bar above to add a visualization to the dashboard.',
            'Add',
            'Add visualization',
          ]}
        >
          {([description1, description2, label, ariaLabel]: string[]) => (
            <span>
              {description1}
              <EuiLink
                onClick={onLinkClick}
                aria-label={ariaLabel}
                data-test-subj={'emptyDashboardAddPanelButton'}
              >
                {label}
              </EuiLink>
              {description2}
            </span>
          )}
        </EuiI18n>
      </p>
      {linkToVisualizeParagraph}
    </React.Fragment>
  );
  const enterEditModeParagraph = (
    <p>
      <EuiI18n
        tokens={[
          'kbn.dashboard.howToStartWorkingOnNewDashboardDescription1',
          'kbn.dashboard.howToStartWorkingOnNewDashboardDescription2',
          'kbn.dashboard.howToStartWorkingOnNewDashboardEditLinkText',
          'kbn.dashboard.howToStartWorkingOnNewDashboardEditLinkAriaLabel',
        ]}
        defaults={[
          'Click the ',
          ' button in the menu bar above to start working on your new dashboard.',
          'Edit',
          'Edit dashboard',
        ]}
      >
        {([description1, description2, label, ariaLabel]: string[]) => (
          <span>
            {description1}
            <EuiLink onClick={onLinkClick} aria-label={ariaLabel}>
              {label}
            </EuiLink>
            {description2}
          </span>
        )}
      </EuiI18n>
    </p>
  );
  return (
    <I18nProvider>
      <React.Fragment>
        <EuiIcon type="dashboardApp" size="xxl" color="subdued" />
        <h2>{fillDashboardTitle}</h2>
        {showLinkToVisualize ? addVisualizationParagraph : enterEditModeParagraph}
      </React.Fragment>
    </I18nProvider>
  );
}
