/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';
import { css } from '@emotion/react';
import {
  EuiButton,
  EuiText,
  EuiAccordion,
  EuiHorizontalRule,
  EuiSpacer,
  EuiFlexGroup,
  EuiFlexItem,
  EuiIcon,
  useEuiTheme,
} from '@elastic/eui';

import { i18n } from '@kbn/i18n';
import type { StepStatus, StepConfig } from '../types';

interface GuidedSetupStepProps {
  accordionId: string;
  stepStatus: StepStatus;
  stepConfig: StepConfig;
  stepNumber: number;
  navigateToStep: (step: StepConfig) => void;
}

export const GuidedSetupStep = ({
  accordionId,
  stepStatus,
  stepNumber,
  stepConfig,
  navigateToStep,
}: GuidedSetupStepProps) => {
  const { euiTheme } = useEuiTheme();

  const stepNumberCss = css`
    width: 24px;
    height: 24px;
    border-radius: 50%;
    border: 2px solid ${euiTheme.colors.success};
    font-weight: ${euiTheme.font.weight.medium};
    text-align: center;
    line-height: 1.4;
  `;

  const stepTitleCss = css`
    font-weight: ${euiTheme.font.weight.bold};
  `;

  const buttonContent = (
    <EuiFlexGroup gutterSize="s" responsive={false} justifyContent="center" alignItems="center">
      <EuiFlexItem grow={false}>
        {stepStatus === 'complete' ? (
          <EuiIcon type="check" size="m" color="white" />
        ) : (
          <span css={stepNumberCss}>{stepNumber}</span>
        )}
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        <EuiText css={stepTitleCss}>{stepConfig.title}</EuiText>
      </EuiFlexItem>
    </EuiFlexGroup>
  );

  return (
    <div>
      <EuiAccordion
        id={accordionId}
        buttonContent={buttonContent}
        arrowDisplay="right"
        forceState={
          stepStatus === 'in_progress' || stepStatus === 'initialized' ? 'open' : 'closed'
        }
      >
        <>
          <EuiSpacer size="s" />
          <EuiText size="s">{stepConfig.description}</EuiText>
          <EuiSpacer />
          {(stepStatus === 'in_progress' || stepStatus === 'initialized') && (
            <EuiFlexGroup justifyContent="flexEnd">
              <EuiFlexItem grow={false}>
                <EuiButton onClick={() => navigateToStep(stepConfig)} fill>
                  {stepStatus === 'in_progress'
                    ? i18n.translate('guidedOnboarding.dropdownPanel.continueStepButtonLabel', {
                        defaultMessage: 'Continue',
                      })
                    : i18n.translate('guidedOnboarding.dropdownPanel.startStepButtonLabel', {
                        defaultMessage: 'Start',
                      })}
                </EuiButton>
              </EuiFlexItem>
            </EuiFlexGroup>
          )}
        </>
      </EuiAccordion>

      <EuiHorizontalRule margin="m" />
    </div>
  );
};
