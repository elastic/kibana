import React from 'react';
import { render, unmountComponentAtNode } from 'react-dom';
import { SourceFiltersTable } from './source_filters_table';

const DOM_ELEMENT_ID = 'reactSourceFiltersTable';

export function renderSourceFiltersTable(
  indexPattern,
  fieldFilter,
  fieldWildcardMatcher,
) {
  const node = document.getElementById(DOM_ELEMENT_ID);
  if (!node) {
    return;
  }

  render(
    <SourceFiltersTable
      indexPattern={indexPattern}
      fieldFilter={fieldFilter}
      fieldWildcardMatcher={fieldWildcardMatcher}
    />,
    node,
  );
}

export function destroySourceFiltersTable() {
  const node = document.getElementById(DOM_ELEMENT_ID);
  node && unmountComponentAtNode(node);
}
