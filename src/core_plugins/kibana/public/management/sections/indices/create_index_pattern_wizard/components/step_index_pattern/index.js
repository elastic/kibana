import React from 'react';
import { render, unmountComponentAtNode } from 'react-dom';
import { StepIndexPattern } from './step_index_pattern';

export function renderStepIndexPattern(
  domElementId,
  allIndices,
  initialQuery,
  isIncludingSystemIndices,
  esService,
  goToNextStep,
) {
  render(
    <StepIndexPattern
      allIndices={allIndices}
      initialQuery={initialQuery}
      isIncludingSystemIndices={isIncludingSystemIndices}
      esService={esService}
      goToNextStep={goToNextStep}
    />,
    document.getElementById(domElementId),
  );
}

export function destroyStepIndexPattern(domElementId) {
  unmountComponentAtNode(document.getElementById(domElementId));
}
