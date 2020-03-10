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

import React, { Component } from 'react';
import {
  EuiForm,
  EuiFormRow,
  EuiFlexGroup,
  EuiFlexItem,
  EuiButton,
  EuiButtonEmpty,
} from '@elastic/eui';
import {
  forOwn,
  indexBy,
  cloneDeep,
  isNumber,
  isBoolean,
  isPlainObject,
  isString,
  set,
} from 'lodash';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n/react';
import {
  SimpleSavedObject,
  SavedObjectsClientContract,
} from '../../../../../../../../../core/public';
import { castEsToKbnFieldTypeName } from '../../../../../../../../../plugins/data/public';
import { SavedObjectLoader } from '../../../../../../../../../plugins/saved_objects/public';
import { Field } from './field';
import { ObjectField, FieldState, SubmittedFormData } from '../../types';

interface FormProps {
  object: SimpleSavedObject;
  service: SavedObjectLoader;
  savedObjectsClient: SavedObjectsClientContract;
  editionEnabled: boolean;
  onSave: (form: SubmittedFormData) => void;
}

interface FormState {
  fields: ObjectField[];
  fieldStates: Record<string, FieldState>;
}

export class Form extends Component<FormProps, FormState> {
  constructor(props: FormProps) {
    super(props);
    this.state = {
      fields: [],
      fieldStates: {},
    };
  }

  componentDidMount() {
    const { object, service } = this.props;

    const fields = Object.entries(object.attributes as Record<string, any>).reduce(
      (objFields, [key, value]) => {
        return [...objFields, ...recursiveCreateFields(key, value)];
      },
      [] as ObjectField[]
    );
    if ((service as any).Class) {
      addFieldsFromClass((service as any).Class, fields);
    }

    this.setState({
      fields,
    });
  }

  render() {
    const { editionEnabled, service } = this.props;
    const { fields, fieldStates } = this.state;
    const isValid = this.isFormValid();
    return (
      <EuiForm data-test-subj="savedObjectEditForm" role="form">
        <div className="kuiVerticalRhythm">
          {fields.map(field => (
            <Field
              key={`${field.type}-${field.name}`}
              type={field.type}
              name={field.name}
              value={field.value}
              state={fieldStates[field.name]}
              disabled={!editionEnabled}
              onChange={this.handleFieldChange}
            />
          ))}
        </div>
        <EuiFormRow fullWidth={true}>
          <EuiFlexGroup responsive={false}>
            {editionEnabled && (
              <EuiFlexItem grow={false}>
                <EuiButton
                  fill={true}
                  aria-label={i18n.translate('kbn.management.objects.view.saveButtonAriaLabel', {
                    defaultMessage: 'Save { title } object',
                    values: {
                      title: service.type,
                    },
                  })}
                  onClick={this.onSubmit}
                  disabled={!isValid}
                  data-test-subj="savedObjectEditSave"
                >
                  <FormattedMessage
                    id="kbn.management.objects.view.saveButtonLabel"
                    defaultMessage="Save { title } object"
                    values={{ title: service.type }}
                  />
                </EuiButton>
              </EuiFlexItem>
            )}

            <EuiFlexItem grow={false}>
              <EuiButtonEmpty
                aria-label={i18n.translate('kbn.management.objects.view.cancelButtonAriaLabel', {
                  defaultMessage: 'Cancel',
                })}
                onClick={this.onCancel}
                data-test-subj="savedObjectEditCancel"
              >
                <FormattedMessage
                  id="kbn.management.objects.view.cancelButtonLabel"
                  defaultMessage="Cancel"
                />
              </EuiButtonEmpty>
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiFormRow>
      </EuiForm>
    );
  }

  handleFieldChange = (name: string, newState: FieldState) => {
    this.setState({
      fieldStates: {
        ...this.state.fieldStates,
        [name]: newState,
      },
    });
  };

  isFormValid() {
    const { fieldStates } = this.state;
    return !Object.values(fieldStates).some(state => state.invalid === true);
  }

  onCancel = () => {
    window.history.back();
  };

  onSubmit = async () => {
    const { object, onSave } = this.props;
    const { fields, fieldStates } = this.state;

    if (!this.isFormValid()) {
      return;
    }

    const source = cloneDeep(object.attributes as any);
    fields.forEach(field => {
      let value = fieldStates[field.name]?.value ?? field.value;

      if (field.type === 'array' && typeof value === 'string') {
        value = JSON.parse(value);
      }

      set(source, field.name, value);
    });

    const { references, ...attributes } = source;

    onSave({ attributes, references });
  };
}

/**
 * Creates a field definition and pushes it to the memo stack. This function
 * is designed to be used in conjunction with _.reduce(). If the
 * values is plain object it will recurse through all the keys till it hits
 * a string, number or an array.
 *
 * @param {string} key The key of the field
 * @param {mixed} value The value of the field
 * @param {array} parents The parent keys to the field
 * @returns {array}
 */
const recursiveCreateFields = (key: string, value: any, parents: string[] = []): ObjectField[] => {
  const path = [...parents, key];

  const field: ObjectField = { type: 'text', name: path.join('.'), value };
  let fields: ObjectField[] = [field];

  if (isString(field.value)) {
    try {
      field.value = JSON.stringify(JSON.parse(field.value), undefined, 2);
      field.type = 'json';
    } catch (err) {
      field.type = 'text';
    }
  } else if (isNumber(field.value)) {
    field.type = 'number';
  } else if (Array.isArray(field.value)) {
    field.type = 'array';
    field.value = JSON.stringify(field.value, undefined, 2);
  } else if (isBoolean(field.value)) {
    field.type = 'boolean';
  } else if (isPlainObject(field.value)) {
    forOwn(field.value, (childValue, childKey) => {
      fields = [...recursiveCreateFields(childKey as string, childValue, path)];
    });
  }

  return fields;
};

const addFieldsFromClass = function(
  Class: { mapping: Record<string, string>; searchSource: any },
  fields: ObjectField[]
) {
  const fieldMap = indexBy(fields, 'name');

  _.forOwn(Class.mapping, (esType, name) => {
    if (!name || fieldMap[name]) {
      return;
    }

    const getFieldTypeFromEsType = () => {
      switch (castEsToKbnFieldTypeName(esType)) {
        case 'string':
          return 'text';
        case 'number':
          return 'number';
        case 'boolean':
          return 'boolean';
        default:
          return 'json';
      }
    };

    fields.push({
      name,
      type: getFieldTypeFromEsType(),
      value: undefined,
    });
  });

  if (Class.searchSource && !fieldMap['kibanaSavedObjectMeta.searchSourceJSON']) {
    fields.push({
      name: 'kibanaSavedObjectMeta.searchSourceJSON',
      type: 'json',
      value: '{}',
    });
  }

  if (!fieldMap.references) {
    fields.push({
      name: 'references',
      type: 'array',
      value: '[]',
    });
  }
};
