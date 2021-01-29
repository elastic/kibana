/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
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
  EuiImage,
  EuiText,
  EuiTitle,
} from '@elastic/eui';
import { IUiSettingsClient, HttpStart } from 'kibana/public';
import { emptyScreenStrings } from '../../../dashboard_strings';

export interface DashboardEmptyScreenProps {
  isEditMode?: boolean;
  onLinkClick: () => void;
  uiSettings: IUiSettingsClient;
  http: HttpStart;
  isReadonlyMode?: boolean;
}

export function DashboardEmptyScreen({
  isEditMode,
  onLinkClick,
  uiSettings,
  http,
  isReadonlyMode,
}: DashboardEmptyScreenProps) {
  const IS_DARK_THEME = uiSettings.get('theme:darkMode');
  const emptyStateGraphicURL = IS_DARK_THEME
    ? '/plugins/home/assets/welcome_graphic_dark_2x.png'
    : '/plugins/home/assets/welcome_graphic_light_2x.png';
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
    emptyScreenStrings.getHowToStartWorkingOnNewDashboardDescription1(),
    emptyScreenStrings.getHowToStartWorkingOnNewDashboardDescription2(),
    emptyScreenStrings.getHowToStartWorkingOnNewDashboardEditLinkText(),
    emptyScreenStrings.getHowToStartWorkingOnNewDashboardEditLinkAriaLabel()
  );
  const page = (mainText: string, showAdditionalParagraph?: boolean, additionalText?: string) => {
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
              <p style={{ fontWeight: 'bold' }}>{mainText}</p>
            </EuiText>
            {additionalText ? (
              <EuiText size="m" color="subdued">
                {additionalText}
              </EuiText>
            ) : null}
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
  const readonlyMode = page(
    emptyScreenStrings.getEmptyDashboardTitle(),
    false,
    emptyScreenStrings.getEmptyDashboardAdditionalPrivilege()
  );
  const viewMode = page(emptyScreenStrings.getFillDashboardTitle(), true);
  const editMode = (
    <div data-test-subj="emptyDashboardWidget" className="dshEmptyWidget testClass">
      <EuiIcon color="subdued" size="xl" type="visAreaStacked" />
      <EuiSpacer size="s" />
      <EuiTitle size="xs">
        <h3>{emptyScreenStrings.getEmptyWidgetTitle()}</h3>
      </EuiTitle>
      <EuiSpacer size="s" />
      <EuiText size="s" color="subdued">
        <span>{emptyScreenStrings.getEmptyWidgetDescription()}</span>
      </EuiText>
    </div>
  );
  const actionableMode = isEditMode ? editMode : viewMode;
  return <I18nProvider>{isReadonlyMode ? readonlyMode : actionableMode}</I18nProvider>;
}
