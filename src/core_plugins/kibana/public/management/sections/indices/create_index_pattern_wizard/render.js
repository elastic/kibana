import React from 'react';
import { render, unmountComponentAtNode } from 'react-dom';
import { CreateIndexPatternWizard } from './create_index_pattern_wizard';

const CREATE_INDEX_PATTERN_DOM_ELEMENT_ID = 'createIndexPatternReact';

export function renderCreateIndexPatternWizard(
  loadingDataDocUrl,
  initialQuery,
  services,
) {
  const node = document.getElementById(CREATE_INDEX_PATTERN_DOM_ELEMENT_ID);
  if (!node) {
    return;
  }

  render(
    <CreateIndexPatternWizard
      loadingDataDocUrl={loadingDataDocUrl}
      initialQuery={initialQuery}
      services={services}
    />,
    node,
  );
}

export function destroyCreateIndexPatternWizard() {
  const node = document.getElementById(CREATE_INDEX_PATTERN_DOM_ELEMENT_ID);
  node && unmountComponentAtNode(node);
}
