import React from 'react';
import { render, unmountComponentAtNode } from 'react-dom';
import { StepIndexPattern } from './step_index_pattern';

function getNode(domElementId) {
  return document.getElementById(domElementId);
}

export function renderStepIndexPattern(
  domElementId,
  allIndices,
  initialQuery,
  isIncludingSystemIndices,
  esService,
  goToNextStep,
) {
  const node = getNode(domElementId);
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
  const node = getNode(domElementId);
  if (!node) {
    return;
  }

  unmountComponentAtNode(node);
}
