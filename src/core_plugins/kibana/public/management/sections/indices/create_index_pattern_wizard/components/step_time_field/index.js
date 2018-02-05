import React from 'react';
import { render, unmountComponentAtNode } from 'react-dom';
import { StepTimeField } from './step_time_field';

const TIME_FIELD_DOM_ELEMENT_ID = 'stepTimeFieldReact';

export function renderStepTimeField(
  indexPattern,
  indexPatternsService,
  goToPreviousStep,
  createIndexPattern,
) {
  const node = document.getElementById(TIME_FIELD_DOM_ELEMENT_ID);
  if (!node) {
    return;
  }

  render(
    <StepTimeField
      indexPattern={indexPattern}
      indexPatternsService={indexPatternsService}
      goToPreviousStep={goToPreviousStep}
      createIndexPattern={createIndexPattern}
    />,
    node,
  );
}

export function destroyStepTimeField() {
  const node = document.getElementById(TIME_FIELD_DOM_ELEMENT_ID);
  node && unmountComponentAtNode(node);
}
