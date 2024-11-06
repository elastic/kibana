/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { EuiHorizontalRule, EuiProgress, EuiSpacer, htmlIdGenerator } from '@elastic/eui';
import type { GuideConfig, GuideStep as GuideStepType, StepConfig } from '@kbn/guided-onboarding';
import { i18n } from '@kbn/i18n';
import { GuideStep } from '../guide_panel_step';
import type { PluginState } from '../../../common';
import { getGuidePanelStyles } from '../guide_panel.styles';

export const GuideProgress = ({
  guideConfig,
  styles,
  pluginState,
  isLoading,
  stepsCompleted,
  isGuideReadyToComplete,
  handleStepButtonClick,
}: {
  guideConfig: GuideConfig;
  styles: ReturnType<typeof getGuidePanelStyles>;
  pluginState: PluginState;
  isLoading: boolean;
  stepsCompleted: number;
  isGuideReadyToComplete: boolean;
  handleStepButtonClick: (stepState: GuideStepType, step: StepConfig) => void;
}) => {
  const { flyoutStepsWrapper } = styles.flyoutOverrides;

  return (
    <>
      {/* Progress bar should only show after the first step has been complete */}
      {stepsCompleted > 0 && (
        <>
          <EuiSpacer size="xl" />
          <EuiProgress
            data-test-subj="guideProgress"
            label={
              isGuideReadyToComplete
                ? i18n.translate('guidedOnboarding.dropdownPanel.completedLabel', {
                    defaultMessage: 'Completed',
                  })
                : i18n.translate('guidedOnboarding.dropdownPanel.progressLabel', {
                    defaultMessage: 'Progress',
                  })
            }
            value={stepsCompleted}
            valueText={i18n.translate('guidedOnboarding.dropdownPanel.progressValueLabel', {
              defaultMessage: '{stepCount} steps',
              values: {
                stepCount: `${stepsCompleted} / ${guideConfig.steps.length}`,
              },
            })}
            max={guideConfig.steps.length}
            size="l"
          />

          <EuiSpacer size="s" />
        </>
      )}

      <EuiHorizontalRule />

      <ol css={flyoutStepsWrapper}>
        {guideConfig?.steps.map((step, index) => {
          const accordionId = htmlIdGenerator(`accordion${index}`)();
          const stepState = pluginState?.activeGuide?.steps[index];

          if (stepState) {
            return (
              <li key={accordionId}>
                <GuideStep
                  isLoading={isLoading}
                  accordionId={accordionId}
                  stepStatus={stepState.status}
                  stepConfig={step}
                  stepNumber={index + 1}
                  handleButtonClick={() => handleStepButtonClick(stepState, step)}
                  telemetryGuideId={guideConfig!.telemetryId}
                />
              </li>
            );
          }
        })}
      </ol>
    </>
  );
};
