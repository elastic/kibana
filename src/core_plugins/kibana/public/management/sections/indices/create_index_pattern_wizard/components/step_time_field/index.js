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
  render(
    <StepTimeField
      indexPattern={indexPattern}
      indexPatternsService={indexPatternsService}
      goToPreviousStep={goToPreviousStep}
      createIndexPattern={createIndexPattern}
    />,
    document.getElementById(TIME_FIELD_DOM_ELEMENT_ID),
  );
}

export function destroyStepTimeField() {
  const node = document.getElementById(TIME_FIELD_DOM_ELEMENT_ID);
  node && unmountComponentAtNode(node);
}
