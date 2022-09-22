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
import type { StepStatus, StepConfig } from '../types';
import { getGuidePanelStepStyles } from './guide_panel_step.styles';

interface GuideStepProps {
  accordionId: string;
  stepStatus: StepStatus;
  stepConfig: StepConfig;
  stepNumber: number;
  navigateToStep: (step: StepConfig) => void;
}

export const GuideStep = ({
  accordionId,
  stepStatus,
  stepNumber,
  stepConfig,
  navigateToStep,
}: GuideStepProps) => {
  const { euiTheme } = useEuiTheme();
  const styles = getGuidePanelStepStyles(euiTheme);

  const buttonContent = (
    <EuiFlexGroup gutterSize="s" responsive={false} justifyContent="center" alignItems="center">
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
      <EuiAccordion
        id={accordionId}
        buttonContent={buttonContent}
        arrowDisplay="right"
        forceState={stepStatus === 'in_progress' ? 'open' : 'closed'}
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
          {stepStatus === 'in_progress' && (
            <EuiFlexGroup justifyContent="flexEnd">
              <EuiFlexItem grow={false}>
                <EuiButton onClick={() => navigateToStep(stepConfig)} fill>
                  {/* TODO: Support for conditional "Continue" button label if user revists a step - https://github.com/elastic/kibana/issues/139752 */}
                  {i18n.translate('guidedOnboarding.dropdownPanel.startStepButtonLabel', {
                    defaultMessage: 'Start',
                  })}
                </EuiButton>
              </EuiFlexItem>
            </EuiFlexGroup>
          )}
        </>
      </EuiAccordion>

      <EuiHorizontalRule margin="l" />
    </div>
  );
};
