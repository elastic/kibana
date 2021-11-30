/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';
import { EuiFormRow, EuiSelect } from '@elastic/eui';
import {
  FieldFormatEditor,
  FieldFormatEditorFactory,
  IndexPatternFieldEditorSetup,
} from '../../../../src/plugins/data_view_field_editor/public';
import { ExampleCurrencyFormat } from '../../common';

// 1. Create an editor component
// NOTE: the `params` field is not type checked and a consumer has to know the `param` format that a particular `formatId` expects,
// https://github.com/elastic/kibana/issues/108158
const ExampleCurrencyFormatEditor: FieldFormatEditor<{ currency: string }> = (props) => {
  return (
    <EuiFormRow label={'Currency'}>
      <EuiSelect
        defaultValue={props.formatParams.currency}
        options={[
          { text: 'EUR', value: 'EUR' },
          { text: 'USD', value: 'USD' },
        ]}
        onChange={(e) => {
          props.onChange({
            currency: e.target.value,
          });
        }}
      />
    </EuiFormRow>
  );
};

// 2. Make sure it has a `formatId` that corresponds to format's id
ExampleCurrencyFormatEditor.formatId = ExampleCurrencyFormat.id;

// 3. Wrap editor component in a factory. This is needed to support and encourage code-splitting.
const ExampleCurrencyFormatEditorFactory: FieldFormatEditorFactory<{
  currency: string;
}> = async () => ExampleCurrencyFormatEditor;
ExampleCurrencyFormatEditorFactory.formatId = ExampleCurrencyFormatEditor.formatId;

export function registerExampleFormatEditor(indexPatternFieldEditor: IndexPatternFieldEditorSetup) {
  // 4. Register a field editor. This should happen in setup plugin lifecycle phase.
  indexPatternFieldEditor.fieldFormatEditors.register(ExampleCurrencyFormatEditorFactory);
}
