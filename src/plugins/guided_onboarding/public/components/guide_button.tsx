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

import { getStepConfig } from '../services/helpers';
import { GuideButtonPopover } from './guide_button_popover';

interface GuideButtonProps {
  guideState: GuideState;
  toggleGuidePanel: () => void;
  isGuidePanelOpen: boolean;
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
  guideState,
  toggleGuidePanel,
  isGuidePanelOpen,
}: GuideButtonProps) => {
  const stepNumber = getStepNumber(guideState);
  const stepReadyToComplete = guideState.steps.find((step) => step.status === 'ready_to_complete');
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
    const stepConfig = getStepConfig(guideState.guideId, stepReadyToComplete.id);
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
