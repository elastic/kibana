/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';
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
import type { StepStatus, GuideStepIds } from '../../common/types';
import type { StepConfig } from '../types';
import { getGuidePanelStepStyles } from './guide_panel_step.styles';

interface GuideStepProps {
  accordionId: string;
  stepStatus: StepStatus;
  stepConfig: StepConfig;
  stepNumber: number;
  navigateToStep: (stepId: GuideStepIds, stepLocation: StepConfig['location']) => void;
}

export const GuideStep = ({
  accordionId,
  stepStatus,
  stepNumber,
  stepConfig,
  navigateToStep,
}: GuideStepProps) => {
  const { euiTheme } = useEuiTheme();
  const styles = getGuidePanelStepStyles(euiTheme, stepStatus);

  const stepTitleContent = (
    <EuiFlexGroup gutterSize="s" responsive={false}>
      <EuiFlexItem grow={false}>
        {stepStatus === 'complete' ? (
          <EuiIcon type="checkInCircleFilled" size="l" color={euiTheme.colors.success} />
        ) : (
          <span css={styles.stepNumber}>{stepNumber}</span>
        )}
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        <EuiText size="m" css={styles.stepTitle}>
          {stepConfig.title}
        </EuiText>
      </EuiFlexItem>
    </EuiFlexGroup>
  );

  return (
    <div data-test-subj="guidePanelStep">
      {stepStatus === 'complete' ? (
        <>{stepTitleContent}</>
      ) : (
        <EuiAccordion
          id={accordionId}
          buttonContent={stepTitleContent}
          arrowDisplay="right"
          initialIsOpen={stepStatus === 'in_progress' || stepStatus === 'active'}
        >
          <>
            <EuiSpacer size="s" />

            <EuiText size="s">
              <ul>
                {stepConfig.descriptionList.map((description, index) => {
                  return <li key={`description-${index}`}>{description}</li>;
                })}
              </ul>
            </EuiText>

            <EuiSpacer />
            {(stepStatus === 'in_progress' || stepStatus === 'active') && (
              <EuiFlexGroup justifyContent="flexEnd">
                <EuiFlexItem grow={false}>
                  <EuiButton
                    onClick={() => navigateToStep(stepConfig.id, stepConfig.location)}
                    fill
                    data-test-subj="activeStepButtonLabel"
                  >
                    {stepStatus === 'active'
                      ? i18n.translate('guidedOnboarding.dropdownPanel.startStepButtonLabel', {
                          defaultMessage: 'Start',
                        })
                      : i18n.translate('guidedOnboarding.dropdownPanel.continueStepButtonLabel', {
                          defaultMessage: 'Continue',
                        })}
                  </EuiButton>
                </EuiFlexItem>
              </EuiFlexGroup>
            )}
          </>
        </EuiAccordion>
      )}

      <EuiHorizontalRule margin="l" />
    </div>
  );
};
