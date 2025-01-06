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
  EuiButton,
  EuiEmptyPrompt,
  EuiFlexGroup,
  EuiFlexItem,
  EuiImage,
  EuiLink,
  EuiSpacer,
  EuiText,
} from '@elastic/eui';
import { GuideConfig, GuideStep as GuideStepType, StepConfig } from '@kbn/guided-onboarding';
import { i18n } from '@kbn/i18n';
import wellDoneAnimatedDarkGif from '../../../assets/well_done_animated_dark.gif';
import { PluginState } from '../../../common';
import { GuideProgress } from './guide_progress';
import wellDoneAnimatedGif from '../../../assets/well_done_animated.gif';
import { getGuidePanelStyles } from '../guide_panel.styles';

export const GuidePanelFlyoutBody = ({
  styles,
  guideConfig,
  isDarkTheme,
  stepsCompleted,
  isGuideReadyToComplete,
  pluginState,
  handleStepButtonClick,
  isLoading,
  completeGuide,
}: {
  styles: ReturnType<typeof getGuidePanelStyles>;
  guideConfig?: GuideConfig;
  isDarkTheme: boolean;
  stepsCompleted: number;
  isGuideReadyToComplete: boolean;
  pluginState?: PluginState;
  handleStepButtonClick: (
    stepState: GuideStepType,
    step: StepConfig
  ) => Promise<{ pluginState: PluginState } | undefined>;
  isLoading: boolean;
  completeGuide: (
    completedGuideRedirectLocation: GuideConfig['completedGuideRedirectLocation']
  ) => Promise<void>;
}) => {
  const docsLink = () => {
    if (!guideConfig || !guideConfig.docs) {
      return null;
    }

    return (
      <>
        <EuiSpacer size="m" />
        <EuiText size="m">
          <EuiLink external target="_blank" href={guideConfig.docs.url}>
            {guideConfig.docs.text}
          </EuiLink>
        </EuiText>
      </>
    );
  };

  if (!guideConfig || !pluginState || (pluginState && pluginState.status === 'error')) {
    return (
      <EuiEmptyPrompt
        data-test-subj="guideErrorSection"
        iconType="alert"
        color="danger"
        title={
          <h2>
            {i18n.translate('guidedOnboarding.dropdownPanel.errorSectionTitle', {
              defaultMessage: 'Unable to load the guide',
            })}
          </h2>
        }
        body={
          <>
            <EuiText color="subdued">
              {i18n.translate('guidedOnboarding.dropdownPanel.errorSectionDescription', {
                defaultMessage: `Wait a moment and try again. If the problem persists, contact your administrator.`,
              })}
            </EuiText>
            <EuiSpacer />
            <EuiButton
              iconSide="right"
              onClick={() => window.location.reload()}
              iconType="refresh"
              color="danger"
            >
              {i18n.translate('guidedOnboarding.dropdownPanel.errorSectionReloadButton', {
                defaultMessage: 'Reload',
              })}
            </EuiButton>
          </>
        }
      />
    );
  }

  if (isGuideReadyToComplete) {
    return (
      <>
        <EuiImage
          size="l"
          src={isDarkTheme ? wellDoneAnimatedDarkGif : wellDoneAnimatedGif}
          alt={i18n.translate('guidedOnboarding.dropdownPanel.wellDoneAnimatedGif', {
            defaultMessage: `Guide completed animated gif`,
          })}
        />

        <EuiSpacer />

        <EuiText size="m">
          <p data-test-subj="guideDescription">
            {i18n.translate('guidedOnboarding.dropdownPanel.completeGuideFlyoutDescription', {
              defaultMessage: `You've completed the Elastic {guideName} guide. Feel free to come back to the Guides for more onboarding help or a refresher.`,
              values: {
                guideName: guideConfig.guideName,
              },
            })}
          </p>
        </EuiText>

        {docsLink()}

        <EuiSpacer />

        <EuiFlexGroup justifyContent="flexStart">
          <EuiFlexItem grow={false}>
            <EuiButton
              isLoading={isLoading}
              onClick={() => completeGuide(guideConfig.completedGuideRedirectLocation)}
              fill
              // data-test-subj used for FS tracking and testing
              data-test-subj={`onboarding--completeGuideButton--${guideConfig!.telemetryId}`}
            >
              {i18n.translate('guidedOnboarding.dropdownPanel.elasticButtonLabel', {
                defaultMessage: 'Continue using Elastic',
              })}
            </EuiButton>
          </EuiFlexItem>
        </EuiFlexGroup>

        <EuiSpacer />
      </>
    );
  }

  return (
    <>
      <div>
        <EuiText size="m">
          <p data-test-subj="guideDescription">{guideConfig.description}</p>
        </EuiText>

        {docsLink()}

        <GuideProgress
          guideConfig={guideConfig}
          styles={styles}
          pluginState={pluginState}
          isLoading={isLoading}
          handleStepButtonClick={handleStepButtonClick}
          isGuideReadyToComplete={isGuideReadyToComplete}
          stepsCompleted={stepsCompleted}
        />
      </div>
    </>
  );
};
