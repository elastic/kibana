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
import type { TourManager } from './tour_manager';
import type { TourState } from './types';

export interface TourProps {
  tourManager: TourManager;
}

export const Tour: React.FC<TourProps> = ({ tourManager }) => {
  const state = useObservable(tourManager.state$);

  if (!state) return null;
  if (state.status !== 'active') return null;

  const currentStep = state.steps[state.currentStepIndex];
  if (!currentStep) return null;

  return <ActiveTour state={state} tourManager={tourManager} />;
};

function ActiveTour({ state, tourManager }: { state: TourState; tourManager: TourManager }) {
  useFinishTourIfNoAnchorFound(state, tourManager);

  const currentStep = state.steps[state.currentStepIndex];
  if (!currentStep) return null;

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
      onFinish={tourManager.isLastStep() ? handleFinish : handleNext}
      step={state.currentStepIndex + 1}
      stepsTotal={state.steps.length}
      content={currentStep.content}
      anchorPosition={'leftCenter'}
      footerAction={
        tourManager.isLastStep() ? (
          <EuiButton size="s" color="success" onClick={handleFinish}>
            Finish tour
          </EuiButton>
        ) : (
          [
            <EuiButtonEmpty size="s" color="text" onClick={handleSkip}>
              Skip tour
            </EuiButtonEmpty>,
            <EuiButton size="s" color="success" onClick={handleNext}>
              Next
            </EuiButton>,
          ]
        )
      }
      minWidth={300}
      maxWidth={360}
    />
  );
}

// in case your can't continue because the target element is missing, we should end the tour
// this is likely an unforeseen edge case, but we want to avoid trapping the user in a broken tour
function useFinishTourIfNoAnchorFound(state: TourState, tourManager: TourManager) {
  useEffect(() => {
    if (state && state.status === 'active') {
      const currentStep = state.steps[state.currentStepIndex];
      if (currentStep) {
        const timeout = setTimeout(() => {
          const target = findElementBySelectorOrRef(currentStep.target);
          if (!target) {
            // eslint-disable-next-line no-console
            console.warn(
              `EUI Tour: Unable to find target element for step id "${currentStep.id}". Ending tour.`
            );
            tourManager.skipTour();
          }
        });
        return () => clearTimeout(timeout);
      }
    }
  }, [state, tourManager]);
}
