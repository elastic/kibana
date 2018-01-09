import React from 'react';
import { render } from 'react-dom';
import { StepIndexPattern } from './step_index_pattern';

export function renderStepIndexPattern(
  domElementId,
  initialIndices,
  initialQuery,
  isIncludingSystemIndices,
  esService,
  goToNextStep,
) {
  render(
    <StepIndexPattern
      initialIndices={initialIndices}
      initialQuery={initialQuery}
      isIncludingSystemIndices={isIncludingSystemIndices}
      esService={esService}
      goToNextStep={goToNextStep}
    />,
    document.getElementById(domElementId),
  );
}
