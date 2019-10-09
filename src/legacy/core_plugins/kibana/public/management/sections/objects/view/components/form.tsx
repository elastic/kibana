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
import React, { useReducer, useEffect } from 'react';
import {
  EuiForm,
  EuiFormRow,
  EuiFieldNumber,
  EuiTextArea,
  EuiCheckbox,
  EuiCodeEditor,
  EuiLoadingContent,
} from '@elastic/eui';

interface Props {
  initialFields: any[];
  canEdit: boolean;
  onChange: (fields: object) => void;
  submit: () => void;
  cancel: () => void;
}

interface State {
  fields: any;
  updated: boolean;
  loading: boolean;
}

type Action =
  | { type: 'UPDATE_FORM'; name: string; value: string | number | boolean }
  | { type: 'ONCHANGE_CALLED' }
  | { type: 'LOADING_FINISHED'; fields: any };

function reducer(state: State, action: Action) {
  switch (action.type) {
    case 'UPDATE_FORM':
      return {
        ...state,
        fields: state.fields.map((field: any) => {
          if (field.name === action.name) {
            return {
              ...field,
              value: action.value,
            };
          } else {
            return { ...field };
          }
        }),
        updated: true,
      };
    case 'ONCHANGE_CALLED':
      return {
        ...state,
        updated: false,
      };
    case 'LOADING_FINISHED':
      return {
        ...state,
        loading: false,
        fields: action.fields,
      };
  }
}

export const Form = ({ initialFields, onChange, canEdit }: Props) => {
  const [{ fields, updated, loading }, dispatch] = useReducer(reducer, {
    fields: initialFields,
    updated: false,
    loading: true,
  });

  useEffect(() => {
    if (updated) {
      onChange(fields);
      dispatch({ type: 'ONCHANGE_CALLED' });
    }
  }, [updated]);

  useEffect(() => {
    if (loading && !!initialFields) {
      dispatch({ type: 'LOADING_FINISHED', fields: initialFields });
    }
  }, [loading, !!initialFields]);

  const getValue = (name: string) => fields.find((field: any) => field.name === name).value;

  const generateField = (field: any) => {
    switch (field.type) {
      case 'number':
        return (
          <EuiFieldNumber
            value={getValue(field.name)}
            onChange={event => {
              const sanitizedValue = parseInt(event.target.value, 10);
              dispatch({
                type: 'UPDATE_FORM',
                name: field.name,
                value: isNaN(sanitizedValue) ? '' : sanitizedValue,
              });
            }}
            disabled={!canEdit}
          />
        );
      case 'textarea':
        return (
          <EuiTextArea
            fullWidth={true}
            rows={1}
            value={getValue(field.name)}
            onChange={event => {
              dispatch({ type: 'UPDATE_FORM', name: field.name, value: event.target.value });
            }}
            disabled={!canEdit}
          />
        );
      case 'boolean':
        return (
          <EuiCheckbox
            id={field.name}
            onChange={event => {
              dispatch({ type: 'UPDATE_FORM', name: field.name, value: event.target.checked });
            }}
            checked={getValue(field.name)}
            disabled={!canEdit}
          />
        );
      case 'json':
      case 'array':
        return (
          <EuiCodeEditor
            width="100%"
            height="300px"
            setOptions={{
              mode: 'ace/mode/json',
              tabSize: 2,
              useSoftTabs: true,
            }}
            value={getValue(field.name)}
            onChange={(value: string) => {
              dispatch({ type: 'UPDATE_FORM', name: field.name, value });
            }}
            isReadOnly={!canEdit}
          />
        );
      default:
        return <></>;
    }
  };

  return loading ? (
    <EuiLoadingContent lines={10} />
  ) : (
    <EuiForm data-test-subj="savedObjectEditForm" role="form">
      {fields.map((field: any) => {
        return (
          <EuiFormRow key={field.name} label={field.name} fullWidth={true}>
            {generateField(field)}
          </EuiFormRow>
        );
      })}
    </EuiForm>
  );
};
