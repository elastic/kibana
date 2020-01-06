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
  EuiLink,
  EuiSpacer,
  EuiPageContent,
  EuiPageBody,
  EuiPage,
  EuiImage,
  EuiText,
  EuiButton,
} from '@elastic/eui';
import { IUiSettingsClient, HttpStart } from 'kibana/public';
import * as constants from './dashboard_empty_screen_constants';

export interface DashboardEmptyScreenProps {
  showLinkToVisualize: boolean;
  onLinkClick: () => void;
  onVisualizeClick?: () => void;
  uiSettings: IUiSettingsClient;
  http: HttpStart;
  isReadonlyMode?: boolean;
}

export function DashboardEmptyScreen({
  showLinkToVisualize,
  onLinkClick,
  onVisualizeClick,
  uiSettings,
  http,
  isReadonlyMode,
}: DashboardEmptyScreenProps) {
  const IS_DARK_THEME = uiSettings.get('theme:darkMode');
  const emptyStateGraphicURL = IS_DARK_THEME
    ? '/plugins/kibana/home/assets/welcome_graphic_dark_2x.png'
    : '/plugins/kibana/home/assets/welcome_graphic_light_2x.png';
  const linkToVisualizeParagraph = (
    <p data-test-subj="linkToVisualizeParagraph">
      <EuiButton
        iconSide="right"
        size="s"
        fill
        iconType="arrowDown"
        onClick={onVisualizeClick}
        data-test-subj="addVisualizationButton"
        aria-label={constants.createNewVisualizationButtonAriaLabel}
      >
        {constants.createNewVisualizationButton}
      </EuiButton>
    </p>
  );
  const paragraph = (
    description1: string | null,
    description2: string,
    linkText: string,
    ariaLabel: string,
    dataTestSubj?: string
  ) => {
    return (
      <EuiText size="m" color="subdued">
        <p>
          {description1}
          {description1 && <span>&nbsp;</span>}
          <EuiLink onClick={onLinkClick} aria-label={ariaLabel} data-test-subj={dataTestSubj || ''}>
            {linkText}
          </EuiLink>
          <span>&nbsp;</span>
          {description2}
        </p>
      </EuiText>
    );
  };
  const enterEditModeParagraph = paragraph(
    constants.howToStartWorkingOnNewDashboardDescription1,
    constants.howToStartWorkingOnNewDashboardDescription2,
    constants.howToStartWorkingOnNewDashboardEditLinkText,
    constants.howToStartWorkingOnNewDashboardEditLinkAriaLabel
  );
  const enterViewModeParagraph = paragraph(
    null,
    constants.addNewVisualizationDescription,
    constants.addExistingVisualizationLinkText,
    constants.addExistingVisualizationLinkAriaLabel
  );
  const page = (text: string, showAdditionalParagraph: boolean) => {
    return (
      <EuiPage className="dshStartScreen" restrictWidth="500px">
        <EuiPageBody>
          <EuiPageContent
            verticalPosition="center"
            horizontalPosition="center"
            paddingSize="none"
            className="dshStartScreen__pageContent"
          >
            <EuiImage url={http.basePath.prepend(emptyStateGraphicURL)} alt="" />
            <EuiText size="m">
              <p style={{ fontWeight: 'bold' }}>{text}</p>
            </EuiText>
            {showAdditionalParagraph ? (
              <React.Fragment>
                <EuiSpacer size="m" />
                <div className="dshStartScreen__panelDesc">{enterEditModeParagraph}</div>
              </React.Fragment>
            ) : null}
          </EuiPageContent>
        </EuiPageBody>
      </EuiPage>
    );
  };
  const readonlyMode = page(constants.emptyDashboardTitle, false);
  const viewMode = page(constants.fillDashboardTitle, true);
  const editMode = (
    <div data-test-subj="emptyDashboardWidget" className="dshEmptyWidget">
      {enterViewModeParagraph}
      <EuiSpacer size="l" />
      {linkToVisualizeParagraph}
    </div>
  );
  const actionableMode = showLinkToVisualize ? editMode : viewMode;
  return <I18nProvider>{isReadonlyMode ? readonlyMode : actionableMode}</I18nProvider>;
}
