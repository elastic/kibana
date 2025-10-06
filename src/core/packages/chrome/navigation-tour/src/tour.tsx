/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useEffect } from 'react';
import { EuiTourStep, EuiButton, EuiButtonEmpty, findElementBySelectorOrRef } from '@elastic/eui';
import useObservable from 'react-use/lib/useObservable';
import { FormattedMessage } from '@kbn/i18n-react';
import type { TourManager } from './tour_manager';
import type { TourState } from './types';

export interface TourProps {
  tourManager: TourManager;
}

export const Tour: React.FC<TourProps> = ({ tourManager }) => {
  const state = useObservable(tourManager.state$);

  if (!state) return null;
  if (state.status === 'idle' || state.status === 'completed' || state.status === 'skipped')
    return null;

  if (state.status === 'waiting') {
    return <WaitingTour state={state} tourManager={tourManager} />;
  }

  const currentStep = state.steps[state.currentStepIndex];
  if (!currentStep) return null;

  return <ActiveTour state={state} tourManager={tourManager} />;
};

function ActiveTour({ state, tourManager }: { state: TourState; tourManager: TourManager }) {
  const currentStep = state.steps[state.currentStepIndex];
  if (!currentStep) return null;

  const isLastStep = state.steps.length === state.currentStepIndex + 1;

  const handleNext = () => {
    tourManager.nextStep();
  };

  const handleSkip = () => {
    tourManager.skipTour();
  };

  const handleFinish = () => {
    tourManager.finishTour();
  };

  return (
    <EuiTourStep
      key={currentStep.id}
      isStepOpen={true}
      title={currentStep.title}
      anchor={currentStep.target}
      onFinish={isLastStep ? handleFinish : handleNext}
      step={state.currentStepIndex + 1}
      stepsTotal={state.steps.length}
      content={currentStep.content}
      anchorPosition={'leftCenter'}
      zIndex={10000 /* we want tour to be on top of other chrome popover */}
      panelProps={{
        'data-test-subj': `nav-tour-step-${currentStep.id}`,
      }}
      display="block"
      footerAction={
        isLastStep ? (
          <EuiButton
            size="s"
            color="success"
            onClick={handleFinish}
            data-test-subj="nav-tour-next-button"
          >
            <FormattedMessage
              id="core.chrome.navigationTour.finishTourButton"
              defaultMessage="Finish tour"
            />
          </EuiButton>
        ) : (
          [
            <EuiButtonEmpty size="s" color="text" onClick={handleSkip}>
              <FormattedMessage
                id="core.chrome.navigationTour.skipTourButton"
                defaultMessage="Skip tour"
              />
            </EuiButtonEmpty>,
            <EuiButton
              size="s"
              color="success"
              onClick={handleNext}
              data-test-subj="nav-tour-next-button"
            >
              <FormattedMessage id="core.chrome.navigationTour.nextButton" defaultMessage="Next" />
            </EuiButton>,
          ]
        )
      }
      minWidth={300}
      maxWidth={360}
      repositionOnScroll={true}
    />
  );
}

function WaitingTour({ state, tourManager }: { state: TourState; tourManager: TourManager }) {
  useEffect(() => {
    const pollForVisibleSteps = () => {
      const requiredSteps = state.steps.filter((step) => step.required);
      const visibleSteps = state.steps.filter((step) => findElementBySelectorOrRef(step.target));

      const canStart =
        requiredSteps.length > 0
          ? requiredSteps.every((step) => visibleSteps.includes(step)) // All required visible
          : visibleSteps.length > 0; // At least one visible

      if (canStart) {
        const visibleStepIds = visibleSteps.map((step) => step.id);
        tourManager.activateTour(visibleStepIds);
        return;
      }

      // Continue polling
      setTimeout(pollForVisibleSteps, 100);
    };

    // Start polling with a small delay to allow DOM to settle
    const timeout = setTimeout(pollForVisibleSteps, 0);

    // Timeout after 10 seconds to prevent infinite waiting
    const maxWaitTimeout = setTimeout(() => {
      tourManager.skipTour();
    }, 10000);

    return () => {
      clearTimeout(timeout);
      clearTimeout(maxWaitTimeout);
    };
  }, [state.steps, tourManager]);

  return null;
}
