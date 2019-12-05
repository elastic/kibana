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
import { I18nProvider, FormattedMessage } from '@kbn/i18n/react';
import { EuiIcon, EuiLink } from '@elastic/eui';
import * as constants from './dashboard_empty_screen_constants';

export interface Props {
  showLinkToVisualize: boolean;
  onLinkClick: () => void;
}

export function DashboardEmptyScreen({ showLinkToVisualize, onLinkClick }: Props) {
  const linkToVisualizeParagraph = (
    <p className="linkToVisualizeParagraph">
      <FormattedMessage
        id="kbn.dashboard.addVisualizationDescription3"
        defaultMessage="If you haven't set up any visualizations yet, {visualizeAppLink} to create your first visualization"
        values={{
          visualizeAppLink: (
            <a className="euiLink" href="#/visualize">
              {constants.visualizeAppLinkTest}
            </a>
          ),
        }}
      />
    </p>
  );
  const paragraph = (
    description1: string,
    description2: string,
    linkText: string,
    ariaLabel: string,
    dataTestSubj?: string
  ) => {
    return (
      <p>
        <span>
          {description1}
          <EuiLink onClick={onLinkClick} aria-label={ariaLabel} data-test-subj={dataTestSubj || ''}>
            {linkText}
          </EuiLink>
          {description2}
        </span>
      </p>
    );
  };
  const addVisualizationParagraph = (
    <React.Fragment>
      {paragraph(
        constants.addVisualizationDescription1,
        constants.addVisualizationDescription2,
        constants.addVisualizationLinkText,
        constants.addVisualizationLinkAriaLabel,
        'emptyDashboardAddPanelButton'
      )}
      {linkToVisualizeParagraph}
    </React.Fragment>
  );
  const enterEditModeParagraph = paragraph(
    constants.howToStartWorkingOnNewDashboardDescription1,
    constants.howToStartWorkingOnNewDashboardDescription2,
    constants.howToStartWorkingOnNewDashboardEditLinkText,
    constants.howToStartWorkingOnNewDashboardEditLinkAriaLabel
  );
  return (
    <I18nProvider>
      <React.Fragment>
        <EuiIcon type="dashboardApp" size="xxl" color="subdued" />
        <h2>{constants.fillDashboardTitle}</h2>
        {showLinkToVisualize ? addVisualizationParagraph : enterEditModeParagraph}
      </React.Fragment>
    </I18nProvider>
  );
}
