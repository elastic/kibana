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
  EuiHorizontalRule,
  EuiSpacer,
  EuiTextColor,
  htmlIdGenerator,
  EuiButtonEmpty,
  EuiTitle,
  EuiLink,
} from '@elastic/eui';

import { ApplicationStart } from '@kbn/core-application-browser';
import { HttpStart } from '@kbn/core-http-browser';
import { i18n } from '@kbn/i18n';
import { guidesConfig } from '../constants';
import type { GuideConfig, StepStatus, GuidedSetupState, StepConfig } from '../types';
import type { ApiService } from '../services/api';

import { GuidedSetupStep } from './guided_setup_panel_step';

interface Props {
  api: ApiService;
  application: ApplicationStart;
  http: HttpStart;
}

const guidedPanelContainerCss = css`
  width: 400px;
`;

const getConfig = (state?: GuidedSetupState): GuideConfig | undefined => {
  if (state?.activeGuide && state.activeGuide !== 'unset') {
    return guidesConfig[state.activeGuide];
  }

  return undefined;
};

const getCurrentStep = (steps?: StepConfig[], state?: GuidedSetupState): number | undefined => {
  if (steps && state?.activeStep) {
    const activeStepIndex = steps.findIndex((step: StepConfig) => step.id === state.activeStep);
    if (activeStepIndex > -1) {
      return activeStepIndex + 1;
    }

    return undefined;
  }
};

// TODO this logic is still not working correctly
const getStepStatus = (steps: StepConfig[], stepIndex: number, activeStep?: string): StepStatus => {
  // If activeStep is unset, we assume the user has just activated the guide but not started the first step
  if (activeStep === 'unset' && stepIndex === 0) {
    return 'initialized';
  }

  const activeStepIndex = steps.findIndex((step: StepConfig) => step.id === activeStep);

  if (activeStepIndex < stepIndex) {
    return 'not_started';
  }

  if (activeStepIndex === stepIndex) {
    return 'in_progress';
  }

  return 'complete';
};

export const GuidedSetupPanel = ({ api, application }: Props) => {
  const [isGuideOpen, setIsGuideOpen] = useState(false);
  const [guidedSetupState, setGuidedSetupState] = useState<GuidedSetupState | undefined>(undefined);
  const isFirstRender = useRef(true);

  const toggleGuide = () => {
    setIsGuideOpen((prevIsGuideOpen) => !prevIsGuideOpen);
  };

  const navigateToStep = (step: StepConfig) => {
    setIsGuideOpen(false);
    if (step.location) {
      application.navigateToApp(step.location.appID, { path: step.location.path });
    }
  };

  const navigateToLandingPage = () => {
    application.navigateToApp('home', { path: '#getting_started' });
  };

  useEffect(() => {
    const subscription = api.fetchGuideState$().subscribe((newState) => {
      if (
        guidedSetupState?.activeGuide !== newState.activeGuide ||
        guidedSetupState?.activeStep !== newState.activeStep
      ) {
        if (isFirstRender.current) {
          isFirstRender.current = false;
        } else {
          setIsGuideOpen(true);
        }
      }
      setGuidedSetupState(newState);
    });
    return () => subscription.unsubscribe();
  }, [api, guidedSetupState?.activeGuide, guidedSetupState?.activeStep]);

  const guideConfig = getConfig(guidedSetupState);

  // TODO handle loading, error state
  if (!guideConfig) {
    return (
      <EuiButton onClick={toggleGuide} color="success" fill isDisabled={true}>
        {i18n.translate('guidedOnboarding.disabledGuidedSetupButtonLabel', {
          defaultMessage: 'Guided setup',
        })}
      </EuiButton>
    );
  }

  const currentStep = getCurrentStep(guideConfig.steps, guidedSetupState);

  return (
    <EuiPopover
      button={
        <EuiButton onClick={toggleGuide} color="success" fill>
          {currentStep
            ? i18n.translate('guidedOnboarding.guidedSetupStepButtonLabel', {
                defaultMessage: 'Guided setup: Step {currentStep}',
                values: {
                  currentStep,
                },
              })
            : i18n.translate('guidedOnboarding.guidedSetupButtonLabel', {
                defaultMessage: 'Guided setup',
              })}
        </EuiButton>
      }
      isOpen={isGuideOpen}
      closePopover={() => setIsGuideOpen(false)}
      anchorPosition="downRight"
      hasArrow={false}
      offset={10}
      panelPaddingSize="l"
    >
      <EuiPopoverTitle>
        <EuiButtonEmpty
          onClick={navigateToLandingPage}
          iconSide="left"
          iconType="arrowLeft"
          flush="left"
          color="text"
        >
          {i18n.translate('guidedOnboarding.dropdownPanel.backToGuidesLink', {
            defaultMessage: 'Back to guides',
          })}
        </EuiButtonEmpty>
        <EuiTitle size="m">
          <h3>{guideConfig?.title}</h3>
        </EuiTitle>
      </EuiPopoverTitle>

      <div css={guidedPanelContainerCss}>
        <EuiText size="m">
          <p>{guideConfig?.description}</p>
        </EuiText>

        {guideConfig.docs && (
          <>
            <EuiSpacer size="s" />
            <EuiLink external target="_blank" href={guideConfig.docs.url}>
              {guideConfig.docs.text}
            </EuiLink>
          </>
        )}

        <EuiHorizontalRule />

        {/* TODO this is still not working correctly */}
        {/* Only show the progress bar when a step is active */}
        {Boolean(currentStep) && (
          <EuiProgress
            label={i18n.translate('guidedOnboarding.dropdownPanel.progressLabel', {
              defaultMessage: 'Progress',
            })}
            // TODO Remove hard-coded values
            value={40}
            max={100}
            size="l"
            valueText
          />
        )}

        <EuiSpacer size="xl" />

        {guideConfig?.steps.map((step, index, steps) => {
          const accordionId = htmlIdGenerator(`accordion${index}`)();
          const stepStatus = getStepStatus(steps, index, guidedSetupState?.activeStep);

          return (
            <GuidedSetupStep
              accordionId={accordionId}
              stepStatus={stepStatus}
              stepConfig={step}
              stepNumber={index + 1}
              navigateToStep={navigateToStep}
            />
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
  );
};
