/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import React from 'react';
import { EuiButton } from '@elastic/eui';
import { JsonEditor } from '../../../../src/plugins/es_ui_shared/public';

export const InputEditor = <T,>(props: { input: T; onSubmit: (value: T) => void }) => {
  const input = JSON.stringify(props.input, null, 4);
  const [value, setValue] = React.useState(input);
  const isValid = (() => {
    try {
      JSON.parse(value);
      return true;
    } catch (e) {
      return false;
    }
  })();
  React.useEffect(() => {
    setValue(input);
  }, [input]);
  return (
    <>
      <JsonEditor
        value={value}
        onUpdate={(v) => setValue(v.data.raw)}
        euiCodeEditorProps={{
          'data-test-subj': 'dashboardEmbeddableByValueInputEditor',
        }}
      />
      <EuiButton
        onClick={() => props.onSubmit(JSON.parse(value))}
        disabled={!isValid}
        data-test-subj={'dashboardEmbeddableByValueInputSubmit'}
      >
        Update Input
      </EuiButton>
    </>
  );
};
