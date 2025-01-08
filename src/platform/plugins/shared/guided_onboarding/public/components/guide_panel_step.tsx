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
  EuiText,
  EuiAccordion,
  EuiHorizontalRule,
  EuiSpacer,
  EuiFlexGroup,
  EuiFlexItem,
  EuiIcon,
  useEuiTheme,
  EuiLink,
} from '@elastic/eui';

import { i18n } from '@kbn/i18n';

import type { StepStatus, StepConfig, StepDescriptionWithLink } from '@kbn/guided-onboarding';
import { getGuidePanelStepStyles } from './guide_panel_step.styles';

interface GuideStepProps {
  accordionId: string;
  stepStatus: StepStatus;
  stepConfig: StepConfig;
  stepNumber: number;
  handleButtonClick: () => void;
  telemetryGuideId: string;
  isLoading: boolean;
}

const renderDescription = (description: string | StepDescriptionWithLink) => {
  if (typeof description === 'string') {
    return description;
  }
  const { descriptionText, linkText, linkUrl, isLinkExternal } = description;
  return (
    <>
      {descriptionText}
      <br />
      <EuiLink
        data-test-subj="guidePanelStepDescriptionLink"
        href={linkUrl}
        target={isLinkExternal ? '_blank' : ''}
      >
        {linkText}
      </EuiLink>
    </>
  );
};
export const GuideStep = ({
  accordionId,
  stepStatus,
  stepNumber,
  stepConfig,
  handleButtonClick,
  telemetryGuideId,
  isLoading,
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
  const isAccordionOpen =
    stepStatus === 'in_progress' || stepStatus === 'active' || stepStatus === 'ready_to_complete';

  const getStepButtonLabel = (): string => {
    switch (stepStatus) {
      case 'active':
        return i18n.translate('guidedOnboarding.dropdownPanel.startStepButtonLabel', {
          defaultMessage: 'Start',
        });
      case 'in_progress':
        return i18n.translate('guidedOnboarding.dropdownPanel.continueStepButtonLabel', {
          defaultMessage: 'Continue',
        });
      case 'ready_to_complete':
        return i18n.translate('guidedOnboarding.dropdownPanel.markDoneStepButtonLabel', {
          defaultMessage: 'Mark done',
        });
    }
    return '';
  };

  return (
    <div data-test-subj="guidePanelStep">
      {stepStatus === 'complete' ? (
        <>{stepTitleContent}</>
      ) : (
        <EuiAccordion
          id={accordionId}
          buttonContent={stepTitleContent}
          arrowDisplay="right"
          initialIsOpen={isAccordionOpen}
        >
          <>
            <EuiSpacer size="s" />
            <EuiText size="s" data-test-subj="guidePanelStepDescription" css={styles.description}>
              {stepConfig.description && <p>{renderDescription(stepConfig.description)}</p>}
              {stepConfig.descriptionList && (
                <ul>
                  {stepConfig.descriptionList.map((description, index) => {
                    return <li key={`description-${index}`}>{renderDescription(description)}</li>;
                  })}
                </ul>
              )}
            </EuiText>

            <EuiSpacer />
            {isAccordionOpen && (
              <EuiFlexGroup justifyContent="flexEnd">
                <EuiFlexItem grow={false}>
                  <EuiButton
                    isLoading={isLoading}
                    onClick={handleButtonClick}
                    fill
                    // data-test-subj used for FS tracking and tests
                    data-test-subj={`onboarding--stepButton--${telemetryGuideId}--step${stepNumber}`}
                  >
                    {getStepButtonLabel()}
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
