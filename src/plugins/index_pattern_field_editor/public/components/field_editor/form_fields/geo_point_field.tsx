/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { useEffect, useState } from 'react';
import { i18n } from '@kbn/i18n';
import { EuiComboBox, EuiComboBoxOptionOption, EuiForm, EuiFormRow } from '@elastic/eui';

import { getKbnFieldType, KBN_FIELD_TYPES } from '@kbn/field-types';
import {
  UseField,
  useFormData,
  RuntimeType,
  FieldConfig,
  CodeEditor,
} from '../../../shared_imports';
import { RuntimeFieldPainlessError } from '../../../lib';
import { schema } from '../form_schema';
import type { FieldFormInternal } from '../field_editor';

interface Props {
  existingConcreteFields?: Array<{ name: string; type: string }>;
}

export const GeoPointField = React.memo(({ existingConcreteFields }: Props) => {
  const [latFieldName, setLatFieldName] = useState<string | undefined>(undefined);
  const [lonFieldName, setLonFieldName] = useState<string | undefined>(undefined);

  const [options, setOptions] = useState<string[]>([]);
  let setScriptSource;

  useEffect(() => {
    const numberFieldType = getKbnFieldType(KBN_FIELD_TYPES.NUMBER);
    setOptions(
      existingConcreteFields
        .filter((field) => {
          return numberFieldType.esTypes.includes(field.type);
        })
        .map((field) => {
          return { value: field.name, label: field.name };
        })
    );
  }, [existingConcreteFields]);

  useEffect(() => {
    if (setScriptSource && latFieldName && lonFieldName) {
      setScriptSource(`emit(doc['${latFieldName}'].value, doc['${lonFieldName}'].value)`);
    }
  }, [latFieldName, lonFieldName, setScriptSource]);

  const sourceFieldConfig: FieldConfig<string> = {
    ...schema.script.source,
    validations: [
      {
        validator: () => {},
      },
    ],
  };

  return (
    <UseField<string> path="script.source" config={sourceFieldConfig}>
      {({ value, setValue }) => {
        setScriptSource = setValue;

        // populate lat and lon fields from value when loading page from existing field
        if (value && !latFieldName && !lonFieldName) {
          const matches = Array.from(value.matchAll(/\[(.*?)\]/g));
          if (matches.length === 2) {
            setLatFieldName(matches[0][1].replaceAll("'", ''));
            setLonFieldName(matches[1][1].replaceAll("'", ''));
          }
        }

        function onLatChange(selectedOptions: Array<EuiComboBoxOptionOption<string>>) {
          if (!selectedOptions.length) {
            return;
          }
          setLatFieldName(selectedOptions[0].value);
        }

        function onLonChange(selectedOptions: Array<EuiComboBoxOptionOption<string>>) {
          if (!selectedOptions.length) {
            return;
          }
          setLonFieldName(selectedOptions[0].value);
        }

        return (
          <EuiForm>
            <EuiFormRow
              label={i18n.translate('indexPatternFieldEditor.editor.form.geoPointLatTitle', {
                defaultMessage: 'Latitude field',
              })}
            >
              <EuiComboBox
                singleSelection={true}
                options={options}
                selectedOptions={latFieldName ? [{ value: latFieldName, label: latFieldName }] : []}
                onChange={onLatChange}
              />
            </EuiFormRow>
            <EuiFormRow
              label={i18n.translate('indexPatternFieldEditor.editor.form.geoPointLonTitle', {
                defaultMessage: 'Longitude field',
              })}
            >
              <EuiComboBox
                singleSelection={true}
                options={options}
                selectedOptions={lonFieldName ? [{ value: lonFieldName, label: lonFieldName }] : []}
                onChange={onLonChange}
              />
            </EuiFormRow>
          </EuiForm>
        );
      }}
    </UseField>
  );
});
