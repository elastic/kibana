/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { EuiTourStep, EuiButton, EuiButtonEmpty } from '@elastic/eui';
import useObservable from 'react-use/lib/useObservable';
import type { TourStep } from '../state';
import { getNavigationTourStateMachine } from '../services';

interface NavigationTourProps {
  steps?: TourStep[];
  onTourComplete?: () => void;
  onTourSkipped?: () => void;
}

export const NavigationTour: React.FC<NavigationTourProps> = ({
  onTourComplete,
  onTourSkipped,
}) => {
  const tourStateMachine = getNavigationTourStateMachine();
  const state = useObservable(tourStateMachine.state$);

  if (!state) return null;

  const handleNext = () => {
    tourStateMachine.nextStep();
  };

  const handleSkip = () => {
    tourStateMachine.skipTour();
    onTourSkipped?.();
  };

  const handleFinish = () => {
    tourStateMachine.finishTour();
    onTourComplete?.();
  };

  // Don't render if tour is not active
  if (!state.isActive) return null;

  const currentStep = state.steps[state.currentStepIndex];
  if (!currentStep) return null;

  return (
    <EuiTourStep
      key={currentStep.id}
      isStepOpen={true}
      title={currentStep.title}
      anchor={currentStep.target}
      onFinish={tourStateMachine.isLastStep() ? handleFinish : handleNext}
      step={state.currentStepIndex + 1 + state.globalStepOffset}
      stepsTotal={state.globalStepsTotal}
      content={currentStep.content}
      anchorPosition={'leftCenter'}
      footerAction={
        tourStateMachine.isLastStep() ? (
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
};
