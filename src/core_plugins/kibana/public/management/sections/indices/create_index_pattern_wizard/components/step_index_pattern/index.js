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
  const node = document.getElementById(domElementId);
  if (!node) {
    return;
  }

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
  const node = document.getElementById(domElementId);
  if (!node) {
    return;
  }

  unmountComponentAtNode(node);
}
