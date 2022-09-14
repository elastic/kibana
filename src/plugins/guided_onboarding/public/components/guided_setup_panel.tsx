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

export const GuidedSetupPanel = ({ api, application, http }: Props) => {
  const [isGuideOpen, setIsGuideOpen] = useState(false);
  const [guidedSetupState, setGuidedSetupState] = useState<GuidedSetupState | undefined>(undefined);
  const isFirstRender = useRef(true);

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

  const toggleGuide = () => {
    setIsGuideOpen((prevIsGuideOpen) => !prevIsGuideOpen);
  };

  const guideConfig = getConfig(guidedSetupState);
  const currentStep = getCurrentStep(guideConfig?.steps, guidedSetupState);

  const navigateToStep = (step: StepConfig) => {
    setIsGuideOpen(false);
    if (step.location) {
      application.navigateToApp(step.location.appID, { path: step.location.path });
    }
  };

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

      <div css={guidedPanelContainerCss}>
        <EuiText>
          <p>{guideConfig?.description}</p>
        </EuiText>
        <EuiSpacer />
        <EuiHorizontalRule />
        <EuiProgress
          label={i18n.translate('guidedOnboarding.dropdownPanel.progressLabel', {
            defaultMessage: 'Progress',
          })}
          value={40}
          max={100}
          size="l"
          valueText
        />
        <EuiSpacer size="xl" />
        {guideConfig?.steps.map((step, index, steps) => {
          const accordionId = htmlIdGenerator(`accordion${index}`)();
          const stepStatus = getStepStatus(steps, index, guidedSetupState?.activeStep);

          return (
            <GuidedSetupStep
              accordionId={accordionId}
              stepStatus={stepStatus}
              step={step}
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
