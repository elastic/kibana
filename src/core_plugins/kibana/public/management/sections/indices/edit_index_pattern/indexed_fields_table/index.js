import React from 'react';
import { render, unmountComponentAtNode } from 'react-dom';
import { IndexedFieldsTable } from './index_fields_table';

const DOM_ELEMENT_ID = 'reactIndexedFieldsTable';

export function renderIndexedFieldsTable(
  indexPattern,
  fieldFilter,
  indexedFieldtypeFilter,
) {
  const node = document.getElementById(DOM_ELEMENT_ID);
  if (!node) {
    return;
  }

  render(
    <IndexedFieldsTable
      indexPattern={indexPattern}
      fieldFilter={fieldFilter}
      indexedFieldtypeFilter={indexedFieldtypeFilter}
    />,
    node,
  );
}

export function destroyIndexedFieldsTable() {
  const node = document.getElementById(DOM_ELEMENT_ID);
  node && unmountComponentAtNode(node);
}
