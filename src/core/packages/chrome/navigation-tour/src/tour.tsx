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
import type { TourManager } from './tour_manager';

export interface TourProps {
  tourManager: TourManager;
}

export const Tour: React.FC<TourProps> = ({ tourManager }) => {
  const state = useObservable(tourManager.state$);

  if (!state) return null;

  const handleNext = () => {
    tourManager.nextStep();
  };

  const handleSkip = () => {
    tourManager.skipTour();
  };

  const handleFinish = () => {
    tourManager.finishTour();
  };

  if (state.status !== 'active') return null;

  const currentStep = state.steps[state.currentStepIndex];
  if (!currentStep) return null;

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
};
