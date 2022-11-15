/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';
import { EuiButton } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import type { GuideState } from '@kbn/guided-onboarding';

import type { PluginState } from '../../common/types';
import { getStepConfig } from '../services/helpers';
import { GuideButtonPopover } from './guide_button_popover';

interface GuideButtonProps {
  pluginState: PluginState | undefined;
  toggleGuidePanel: () => void;
  isGuidePanelOpen: boolean;
  navigateToLandingPage: () => void;
}

const getStepNumber = (state: GuideState): number | undefined => {
  let stepNumber: number | undefined;

  state.steps.forEach((step, stepIndex) => {
    // If the step is in_progress or ready_to_complete, show that step number
    if (step.status === 'in_progress' || step.status === 'ready_to_complete') {
      stepNumber = stepIndex + 1;
    }

    // If the step is active, show the previous step number
    if (step.status === 'active') {
      stepNumber = stepIndex;
    }
  });

  return stepNumber;
};

export const GuideButton = ({
  pluginState,
  toggleGuidePanel,
  isGuidePanelOpen,
  navigateToLandingPage,
}: GuideButtonProps) => {
  // TODO handle loading, error state
  // https://github.com/elastic/kibana/issues/139799, https://github.com/elastic/kibana/issues/139798

  // if there is no active guide
  if (!pluginState || !pluginState.activeGuide || !pluginState.activeGuide.isActive) {
    // if still active period and the user has not started a guide or skipped the guide,
    // display the button that redirects to the landing page
    if (
      !(
        pluginState?.isActivePeriod &&
        (pluginState?.status === 'not_started' || pluginState?.status === 'skipped')
      )
    ) {
      return null;
    } else {
      return (
        <EuiButton
          onClick={navigateToLandingPage}
          color="success"
          fill
          size="s"
          data-test-subj="guideButtonRedirect"
        >
          {i18n.translate('guidedOnboarding.guidedSetupRedirectButtonLabel', {
            defaultMessage: 'Setup guide',
          })}
        </EuiButton>
      );
    }
  }
  const stepNumber = getStepNumber(pluginState.activeGuide);
  const stepReadyToComplete = pluginState.activeGuide.steps.find(
    (step) => step.status === 'ready_to_complete'
  );
  const button = (
    <EuiButton
      onClick={toggleGuidePanel}
      color="success"
      fill
      size="s"
      data-test-subj="guideButton"
    >
      {Boolean(stepNumber)
        ? i18n.translate('guidedOnboarding.guidedSetupStepButtonLabel', {
            defaultMessage: 'Setup guide: step {stepNumber}',
            values: {
              stepNumber,
            },
          })
        : i18n.translate('guidedOnboarding.guidedSetupButtonLabel', {
            defaultMessage: 'Setup guide',
          })}
    </EuiButton>
  );
  if (stepReadyToComplete) {
    const stepConfig = getStepConfig(pluginState.activeGuide.guideId, stepReadyToComplete.id);
    // check if the stepConfig has manualCompletion info
    if (stepConfig && stepConfig.manualCompletion) {
      return (
        <GuideButtonPopover
          button={button}
          isGuidePanelOpen={isGuidePanelOpen}
          title={stepConfig.manualCompletion.title}
          description={stepConfig.manualCompletion.description}
        />
      );
    }
  }
  return button;
};
