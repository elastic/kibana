/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import React, { useState, useMemo, useCallback } from 'react';

import { EuiFormRow, EuiIconTip, EuiCodeEditor, EuiScreenReaderOnly } from '@elastic/eui';
import { i18n } from '@kbn/i18n';

import { AggParamEditorProps } from '../agg_param_props';

import 'brace/theme/github';

function RawJsonParamEditor({
  showValidation,
  value = '',
  setValidity,
  setValue,
  setTouched,
}: AggParamEditorProps<string>) {
  const [isFieldValid, setFieldValidity] = useState(true);
  const [editorReady, setEditorReady] = useState(false);

  const editorTooltipText = useMemo(
    () =>
      i18n.translate('visDefaultEditor.controls.jsonInputTooltip', {
        defaultMessage:
          "Any JSON formatted properties you add here will be merged with the elasticsearch aggregation definition for this section. For example 'shard_size' on a terms aggregation.",
      }),
    []
  );

  const jsonEditorLabelText = useMemo(
    () =>
      i18n.translate('visDefaultEditor.controls.jsonInputLabel', {
        defaultMessage: 'JSON input',
      }),
    []
  );

  const label = useMemo(
    () => (
      <>
        {jsonEditorLabelText}{' '}
        <EuiIconTip position="right" content={editorTooltipText} type="questionInCircle" />
      </>
    ),
    [jsonEditorLabelText, editorTooltipText]
  );

  const onEditorValidate = useCallback(
    (annotations: unknown[]) => {
      // The first onValidate returned from EuiCodeEditor is a false negative
      if (editorReady) {
        const validity = annotations.length === 0;
        setFieldValidity(validity);
        setValidity(validity);
      } else {
        setEditorReady(true);
      }
    },
    [setValidity, editorReady]
  );

  return (
    <EuiFormRow
      label={label}
      isInvalid={showValidation ? !isFieldValid : false}
      fullWidth={true}
      display="rowCompressed"
    >
      <>
        <EuiCodeEditor
          mode="json"
          theme="github"
          width="100%"
          height="250px"
          value={value}
          onValidate={onEditorValidate}
          setOptions={{
            fontSize: '14px',
          }}
          onChange={setValue}
          onBlur={setTouched}
          aria-label={jsonEditorLabelText}
          aria-describedby="jsonEditorDescription"
        />
        <EuiScreenReaderOnly>
          <p id="jsonEditorDescription">{editorTooltipText}</p>
        </EuiScreenReaderOnly>
      </>
    </EuiFormRow>
  );
}

export { RawJsonParamEditor };
