import React from 'react';
import { render, unmountComponentAtNode } from 'react-dom';
import { StepIndexPattern } from './step_index_pattern';

const INDEX_PATTERN_DOM_ELEMENT_ID = 'stepIndexPatternReact';

export function renderStepIndexPattern(
  allIndices,
  initialQuery,
  isIncludingSystemIndices,
  esService,
  savedObjectsClient,
  goToNextStep,
) {
  const node = document.getElementById(INDEX_PATTERN_DOM_ELEMENT_ID);
  if (!node) {
    return;
  }

  render(
    <StepIndexPattern
      allIndices={allIndices}
      initialQuery={initialQuery}
      isIncludingSystemIndices={isIncludingSystemIndices}
      esService={esService}
      savedObjectsClient={savedObjectsClient}
      goToNextStep={goToNextStep}
    />,
    node,
  );
}

export function destroyStepIndexPattern() {
  const node = document.getElementById(INDEX_PATTERN_DOM_ELEMENT_ID);
  node && unmountComponentAtNode(node);
}
