/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import {
  EuiButtonEmpty,
  EuiPanel,
  EuiPortal,
  EuiOverlayMask,
  EuiFocusTrap,
  EuiThemeComputed,
} from '@elastic/eui';
import { GuideConfig, GuideStep as GuideStepType, StepConfig } from '@kbn/guided-onboarding';
import { i18n } from '@kbn/i18n';
import { GuidePanelFlyoutHeader } from './guide_panel_flyout_header';
import { GuidePanelFlyoutBody } from './guide_panel_flyout_body';
import type { PluginState } from '../../../common';
import { GuidePanelFlyoutFooter } from './guide_panel_flyout_footer';
import { getGuidePanelStyles } from '../guide_panel.styles';

export const GuidePanelFlyout = ({
  isOpen,
  isDarkTheme,
  toggleGuide,
  isGuideReadyToComplete,
  guideConfig,
  styles,
  navigateToLandingPage,
  stepsCompleted,
  pluginState,
  handleStepButtonClick,
  isLoading,
  euiTheme,
  openQuitGuideModal,
  completeGuide,
}: {
  isOpen: boolean;
  isDarkTheme: boolean;
  toggleGuide: () => void;
  isGuideReadyToComplete: boolean;
  guideConfig?: GuideConfig;
  styles: ReturnType<typeof getGuidePanelStyles>;
  navigateToLandingPage: () => void;
  stepsCompleted: number;
  pluginState?: PluginState;
  handleStepButtonClick: (
    stepState: GuideStepType,
    step: StepConfig
  ) => Promise<{ pluginState: PluginState } | undefined>;
  isLoading: boolean;
  euiTheme: EuiThemeComputed;
  openQuitGuideModal: () => void;
  completeGuide: (
    completedGuideRedirectLocation: GuideConfig['completedGuideRedirectLocation']
  ) => Promise<void>;
}) => {
  if (!isOpen) {
    return null;
  }

  const guidePanelFlyoutTitleId = 'onboarding-guide';
  const backToGuidesButton = (
    <EuiButtonEmpty
      onClick={navigateToLandingPage}
      iconSide="left"
      iconType="arrowLeft"
      flush="left"
      color="text"
    >
      {i18n.translate('guidedOnboarding.dropdownPanel.backToGuidesLink', {
        defaultMessage: 'Back to guides',
      })}
    </EuiButtonEmpty>
  );

  const hasError = !guideConfig || !pluginState || (pluginState && pluginState.status === 'error');
  const {
    flyoutContentWrapper,
    flyoutBody,
    flyoutBodyWrapper,
    flyoutContainerError,
    flyoutContainer,
  } = styles.flyoutOverrides;

  return (
    <EuiPortal>
      <EuiOverlayMask>
        <EuiFocusTrap onClickOutside={toggleGuide}>
          <EuiPanel
            data-test-subj="guidePanel"
            aria-labelledby={guidePanelFlyoutTitleId}
            role="dialog"
            css={hasError ? flyoutContainerError : flyoutContainer}
          >
            <div css={flyoutContentWrapper}>
              <GuidePanelFlyoutHeader
                styles={styles}
                titleId={guidePanelFlyoutTitleId}
                toggleGuide={toggleGuide}
                guideConfig={guideConfig}
                isGuideReadyToComplete={isGuideReadyToComplete}
                backButton={backToGuidesButton}
                hasError={hasError}
              />

              <div css={flyoutBodyWrapper}>
                <div css={flyoutBody}>
                  <GuidePanelFlyoutBody
                    styles={styles}
                    guideConfig={guideConfig}
                    pluginState={pluginState}
                    handleStepButtonClick={handleStepButtonClick}
                    isLoading={isLoading}
                    isDarkTheme={isDarkTheme}
                    stepsCompleted={stepsCompleted}
                    isGuideReadyToComplete={isGuideReadyToComplete}
                    completeGuide={completeGuide}
                  />
                </div>
              </div>

              {!hasError && (
                <GuidePanelFlyoutFooter
                  styles={styles}
                  euiTheme={euiTheme}
                  openQuitGuideModal={openQuitGuideModal}
                />
              )}
            </div>
          </EuiPanel>
        </EuiFocusTrap>
      </EuiOverlayMask>
    </EuiPortal>
  );
};
