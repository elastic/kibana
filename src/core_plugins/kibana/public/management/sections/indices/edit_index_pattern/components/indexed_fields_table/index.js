import React from 'react';
import { render, unmountComponentAtNode } from 'react-dom';
import { IndexedFieldsTable } from './indexed_fields_table';

export function renderIndexedFieldsTable(
  domElementId,
  indexPattern,
  fieldFilter,
  typeFilter,
) {
  render(
    <IndexedFieldsTable
      indexPattern={indexPattern}
      fieldFilter={fieldFilter || ''}
      typeFilter={typeFilter || ''}
    />,
    document.getElementById(domElementId),
  );
}

export function destroyIndexedFieldsTable(domElementId) {
  unmountComponentAtNode(document.getElementById(domElementId));
}
