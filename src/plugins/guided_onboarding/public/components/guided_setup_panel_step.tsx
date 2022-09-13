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
  step: StepConfig;
  navigateToStep: (step: StepConfig) => void;
}

export const GuidedSetupStep = ({
  accordionId,
  stepStatus,
  step,
  navigateToStep,
}: GuidedSetupStepProps) => {
  const { euiTheme } = useEuiTheme();

  const statusCircleCss = ({ status }: { status: StepStatus }) => css`
    width: 24px;
    height: 24px;
    border-radius: 32px;
    ${(status === 'complete' || status === 'in_progress') &&
    `background-color: ${euiTheme.colors.success};`}
    ${status === 'incomplete' &&
    `
    border: 2px solid ${euiTheme.colors.lightShade};
  `}
  `;

  const buttonContent = (
    <EuiFlexGroup gutterSize="s">
      <EuiFlexItem grow={false}>
        <span css={statusCircleCss({ status: stepStatus })} className="eui-textCenter">
          <span className="euiScreenReaderOnly">{stepStatus}</span>
          {stepStatus === 'complete' && <EuiIcon type="check" color="white" />}
        </span>
      </EuiFlexItem>
      <EuiFlexItem grow={false}>{step.title}</EuiFlexItem>
    </EuiFlexGroup>
  );

  return (
    <div>
      <EuiAccordion
        id={accordionId}
        buttonContent={buttonContent}
        arrowDisplay="right"
        forceState={stepStatus === 'in_progress' ? 'open' : 'closed'}
      >
        <>
          <EuiSpacer size="s" />
          <EuiText size="s">{step.description}</EuiText>
          <EuiSpacer />
          {stepStatus === 'in_progress' && (
            <EuiFlexGroup justifyContent="flexEnd">
              <EuiFlexItem grow={false}>
                <EuiButton onClick={() => navigateToStep(step)} fill>
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

      <EuiHorizontalRule margin="m" />
    </div>
  );
};
