/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { useState, useEffect, useRef } from 'react';
import { css } from '@emotion/react';
import {
  EuiPopover,
  EuiPopoverTitle,
  EuiPopoverFooter,
  EuiButton,
  EuiText,
  EuiProgress,
  EuiAccordion,
  EuiHorizontalRule,
  EuiSpacer,
  EuiTextColor,
  htmlIdGenerator,
  EuiFlexGroup,
  EuiFlexItem,
  EuiIcon,
  useEuiTheme,
  EuiButtonEmpty,
  EuiTitle,
} from '@elastic/eui';

import { ApplicationStart } from '@kbn/core-application-browser';
import { HttpStart } from '@kbn/core-http-browser';
import { i18n } from '@kbn/i18n';
import { guidesConfig } from '../constants';
import type { GuideConfig, StepStatus, GuidedOnboardingState, StepConfig } from '../types';
import type { ApiService } from '../services/api';

interface Props {
  api: ApiService;
  application: ApplicationStart;
  http: HttpStart;
}

const getConfig = (state?: GuidedOnboardingState): GuideConfig | undefined => {
  if (state?.activeGuide && state.activeGuide !== 'unset') {
    return guidesConfig[state.activeGuide];
  }

  return undefined;
};

const getStepLabel = (steps?: StepConfig[], state?: GuidedOnboardingState): string => {
  if (steps && state?.activeStep) {
    const activeStepIndex = steps.findIndex((step: StepConfig) => step.id === state.activeStep);
    if (activeStepIndex > -1) {
      return `: Step ${activeStepIndex + 1}`;
    }
  }
  return '';
};

const getStepStatus = (steps: StepConfig[], stepIndex: number, activeStep?: string): StepStatus => {
  const activeStepIndex = steps.findIndex((step: StepConfig) => step.id === activeStep);
  if (activeStepIndex < stepIndex) {
    return 'incomplete';
  }
  if (activeStepIndex === stepIndex) {
    return 'in_progress';
  }
  return 'complete';
};

export const GuidedOnboardingButton = ({ api, application, http }: Props) => {
  const [isPopoverOpen, setIsPopoverOpen] = useState(false);

  const [guidedOnboardingState, setGuidedOnboardingState] = useState<
    GuidedOnboardingState | undefined
  >(undefined);

  const firstRender = useRef(true);

  useEffect(() => {
    const subscription = api.fetchGuideState$().subscribe((newState) => {
      if (
        guidedOnboardingState?.activeGuide !== newState.activeGuide ||
        guidedOnboardingState?.activeStep !== newState.activeStep
      ) {
        if (firstRender.current) {
          firstRender.current = false;
        } else {
          setIsPopoverOpen(true);
        }
      }
      setGuidedOnboardingState(newState);
    });
    return () => subscription.unsubscribe();
  }, [api, guidedOnboardingState?.activeGuide, guidedOnboardingState?.activeStep]);

  const { euiTheme } = useEuiTheme();

  const togglePopover = () => {
    setIsPopoverOpen((prevIsPopoverOpen) => !prevIsPopoverOpen);
  };

  const popoverContainerCss = css`
    width: 400px;
  `;

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

  const guideConfig = getConfig(guidedOnboardingState);
  const stepLabel = getStepLabel(guideConfig?.steps, guidedOnboardingState);

  const navigateToStep = (step: StepConfig) => {
    setIsPopoverOpen(false);
    if (step.location) {
      application.navigateToApp(step.location.appID, { path: step.location.path });
    }
  };

  return guideConfig ? (
    <EuiPopover
      button={
        <EuiButton onClick={togglePopover} color="success" fill>
          {i18n.translate('guidedOnboarding.guidedSetupButtonLabel', {
            defaultMessage: 'Guided setup{stepLabel}',
            values: {
              stepLabel,
            },
          })}
        </EuiButton>
      }
      isOpen={isPopoverOpen}
      closePopover={() => setIsPopoverOpen(false)}
      anchorPosition="downRight"
      hasArrow={false}
      offset={10}
      panelPaddingSize="l"
    >
      <EuiPopoverTitle>
        <EuiButtonEmpty
          onClick={() => {}}
          iconSide="left"
          iconType="arrowLeft"
          isDisabled={true}
          flush="left"
        >
          {i18n.translate('guidedOnboarding.dropdownPanel.backToGuidesLink', {
            defaultMessage: 'Back to guides',
          })}
        </EuiButtonEmpty>
        <EuiTitle size="m">
          <h3>{guideConfig?.title}</h3>
        </EuiTitle>
      </EuiPopoverTitle>

      <div css={popoverContainerCss}>
        <EuiText>
          <p>{guideConfig?.description}</p>
        </EuiText>
        <EuiSpacer />
        <EuiHorizontalRule />
        <EuiProgress label="Progress" value={40} max={100} size="l" valueText />
        <EuiSpacer size="xl" />
        {guideConfig?.steps.map((step, index, steps) => {
          const accordionId = htmlIdGenerator(`accordion${index}`)();

          const stepStatus = getStepStatus(steps, index, guidedOnboardingState?.activeStep);
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
                          {/* TODO: Support for conditional "Continue" button label if user revists a step  */}
                          {i18n.translate('guidedOnboarding.dropdownPanel.startStepButtonLabel', {
                            defaultMessage: 'Start',
                          })}
                        </EuiButton>
                      </EuiFlexItem>
                    </EuiFlexGroup>
                  )}
                </>
              </EuiAccordion>

              {/* Do not show horizontal rule for last item */}
              {guideConfig.steps.length - 1 !== index && <EuiHorizontalRule margin="m" />}
            </div>
          );
        })}
        <EuiPopoverFooter>
          <EuiText size="xs" textAlign="center">
            <EuiTextColor color="subdued">
              <p>
                {i18n.translate('guidedOnboarding.dropdownPanel.footerDescription', {
                  defaultMessage: `Got questions? We're here to help.`,
                })}
              </p>
            </EuiTextColor>
          </EuiText>
        </EuiPopoverFooter>
      </div>
    </EuiPopover>
  ) : (
    <EuiButton onClick={togglePopover} color="success" fill isDisabled={true}>
      Guided setup
    </EuiButton>
  );
};
