import React from 'react';
import { render, unmountComponentAtNode } from 'react-dom';
import { ScriptedFieldsTable } from './scripted_fields_table';

import './scripted_fields_table_angular';

const DOM_ELEMENT_ID = 'reactScriptedFieldsTable';

export function renderScriptedFieldsTable(
  indexPattern,
  fieldFilter,
  scriptedFieldLanguageFilter,
  helpers,
) {
  const node = document.getElementById(DOM_ELEMENT_ID);
  if (!node) {
    return;
  }

  render(
    <ScriptedFieldsTable
      indexPattern={indexPattern}
      fieldFilter={fieldFilter}
      scriptedFieldLanguageFilter={scriptedFieldLanguageFilter}
      helpers={helpers}
    />,
    node,
  );
}

export function destroyScriptedFieldsTable() {
  const node = document.getElementById(DOM_ELEMENT_ID);
  node && unmountComponentAtNode(node);
}
