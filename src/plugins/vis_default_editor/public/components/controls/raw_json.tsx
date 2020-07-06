/*
 * Licensed to Elasticsearch B.V. under one or more contributor
 * license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright
 * ownership. Elasticsearch B.V. licenses this file to you under
 * the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
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
      compressed
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
