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
  EuiFlexGroup,
  EuiFlexItem,
  EuiButton,
  EuiButtonEmpty,
  EuiSpacer,
} from '@elastic/eui';
import { set } from '@elastic/safer-lodash-set';
import { cloneDeep } from 'lodash';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n/react';
import { SimpleSavedObject, SavedObjectsClientContract } from '../../../../../../core/public';
import { SavedObjectLoader } from '../../../../../saved_objects/public';
import { Field } from './field';
import { ObjectField, FieldState, SubmittedFormData } from '../../types';
import { createFieldList } from '../../../lib';

interface FormProps {
  object: SimpleSavedObject;
  service: SavedObjectLoader;
  savedObjectsClient: SavedObjectsClientContract;
  editionEnabled: boolean;
  onSave: (form: SubmittedFormData) => Promise<void>;
}

interface FormState {
  fields: ObjectField[];
  fieldStates: Record<string, FieldState>;
  submitting: boolean;
}

export class Form extends Component<FormProps, FormState> {
  constructor(props: FormProps) {
    super(props);
    this.state = {
      fields: [],
      fieldStates: {},
      submitting: false,
    };
  }

  componentDidMount() {
    const { object, service } = this.props;

    const fields = createFieldList(object, service);

    this.setState({
      fields,
    });
  }

  render() {
    const { editionEnabled, service } = this.props;
    const { fields, fieldStates, submitting } = this.state;
    const isValid = this.isFormValid();
    return (
      <EuiForm data-test-subj="savedObjectEditForm" role="form">
        {fields.map((field) => (
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
        <EuiSpacer size={'l'} />
        <EuiFlexGroup responsive={false} gutterSize={'m'}>
          {editionEnabled && (
            <EuiFlexItem grow={false}>
              <EuiButton
                fill={true}
                aria-label={i18n.translate('savedObjectsManagement.view.saveButtonAriaLabel', {
                  defaultMessage: 'Save { title } object',
                  values: {
                    title: service.type,
                  },
                })}
                onClick={this.onSubmit}
                disabled={!isValid || submitting}
                data-test-subj="savedObjectEditSave"
              >
                <FormattedMessage
                  id="savedObjectsManagement.view.saveButtonLabel"
                  defaultMessage="Save { title } object"
                  values={{ title: service.type }}
                />
              </EuiButton>
            </EuiFlexItem>
          )}

          <EuiFlexItem grow={false}>
            <EuiButtonEmpty
              aria-label={i18n.translate('savedObjectsManagement.view.cancelButtonAriaLabel', {
                defaultMessage: 'Cancel',
              })}
              onClick={this.onCancel}
              data-test-subj="savedObjectEditCancel"
            >
              <FormattedMessage
                id="savedObjectsManagement.view.cancelButtonLabel"
                defaultMessage="Cancel"
              />
            </EuiButtonEmpty>
          </EuiFlexItem>
        </EuiFlexGroup>
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
    return !Object.values(fieldStates).some((state) => state.invalid === true);
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

    this.setState({
      submitting: true,
    });

    const source = cloneDeep(object.attributes as any);
    fields.forEach((field) => {
      let value = fieldStates[field.name]?.value ?? field.value;

      if (field.type === 'array' && typeof value === 'string') {
        value = JSON.parse(value);
      }

      set(source, field.name, value);
    });

    // we extract the `references` field that does not belong to attributes
    const { references, ...attributes } = source;

    await onSave({ attributes, references });

    this.setState({
      submitting: false,
    });
  };
}
