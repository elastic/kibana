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
import { I18nProvider } from '@kbn/i18n/react';
import {
  EuiIcon,
  EuiLink,
  EuiSpacer,
  EuiPageContent,
  EuiPageBody,
  EuiPage,
  EuiText,
  EuiButton,
} from '@elastic/eui';
import * as constants from './dashboard_empty_screen_constants';

export interface DashboardEmptyScreenProps {
  showLinkToVisualize: boolean;
  onLinkClick: () => void;
  onVisualizeClick?: () => void;
}

export function DashboardEmptyScreen({
  showLinkToVisualize,
  onLinkClick,
  onVisualizeClick,
}: DashboardEmptyScreenProps) {
  const linkToVisualizeParagraph = (
    <p data-test-subj="linkToVisualizeParagraph">
      <EuiButton
        iconSide="right"
        fill
        iconType="arrowDown"
        onClick={onVisualizeClick}
        data-test-subj="addVisualizationButton"
      >
        {constants.createNewVisualizationButton}
      </EuiButton>
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
      <EuiText size="m">
        <p>
          {description1}
          <EuiLink onClick={onLinkClick} aria-label={ariaLabel} data-test-subj={dataTestSubj || ''}>
            {linkText}
          </EuiLink>
          {description2}
        </p>
      </EuiText>
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
      <EuiSpacer size="m" />
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
      <EuiPage className="dshStartScreen" restrictWidth="36em">
        <EuiPageBody>
          <EuiPageContent verticalPosition="center" horizontalPosition="center">
            <EuiIcon type="dashboardApp" size="xxl" color="subdued" />
            <EuiSpacer size="s" />
            <EuiText grow={true}>
              <h2 key={0.5}>{constants.fillDashboardTitle}</h2>
            </EuiText>
            <EuiSpacer size="m" />
            {showLinkToVisualize ? addVisualizationParagraph : enterEditModeParagraph}
          </EuiPageContent>
        </EuiPageBody>
      </EuiPage>
    </I18nProvider>
  );
}
