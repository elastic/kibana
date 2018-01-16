import React from 'react';
import { render, unmountComponentAtNode } from 'react-dom';
import { StepIndexPattern } from './step_index_pattern';

export const INDEX_PATTERN_DOM_ELEMENT_ID = 'stepIndexPatternReact';

export function renderStepIndexPattern(
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
    document.getElementById(INDEX_PATTERN_DOM_ELEMENT_ID),
  );
}

export function destroyStepIndexPattern() {
  const node = document.getElementById(INDEX_PATTERN_DOM_ELEMENT_ID);
  node && unmountComponentAtNode(node);
}
