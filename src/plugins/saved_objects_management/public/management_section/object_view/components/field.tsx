/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import React, { PureComponent } from 'react';
import { EuiFieldNumber, EuiFieldText, EuiFormRow, EuiSwitch, EuiCodeEditor } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n/react';
import { FieldState, FieldType } from '../../types';

interface FieldProps {
  type: FieldType;
  name: string;
  value: any;
  disabled: boolean;
  state?: FieldState;
  onChange: (name: string, state: FieldState) => void;
}

export class Field extends PureComponent<FieldProps> {
  render() {
    const { name } = this.props;

    return (
      <EuiFormRow fullWidth={true} label={name}>
        {this.renderField()}
      </EuiFormRow>
    );
  }

  onCodeEditorChange(targetValue: any) {
    const { name, onChange } = this.props;
    let invalid = false;
    try {
      JSON.parse(targetValue);
    } catch (e) {
      invalid = true;
    }
    onChange(name, {
      value: targetValue,
      invalid,
    });
  }

  onFieldChange(targetValue: any) {
    const { name, type, onChange } = this.props;

    let newParsedValue = targetValue;
    let invalid = false;
    if (type === 'number') {
      try {
        newParsedValue = Number(newParsedValue);
      } catch (e) {
        invalid = true;
      }
    }
    onChange(name, {
      value: newParsedValue,
      invalid,
    });
  }

  renderField() {
    const { type, name, state, disabled } = this.props;
    const currentValue = state?.value ?? this.props.value;

    switch (type) {
      case 'number':
        return (
          <EuiFieldNumber
            name={name}
            id={this.fieldId}
            value={currentValue}
            onChange={(e) => this.onFieldChange(e.target.value)}
            disabled={disabled}
            data-test-subj={`savedObjects-editField-${name}`}
          />
        );
      case 'boolean':
        return (
          <EuiSwitch
            name={name}
            id={this.fieldId}
            label={
              !!currentValue ? (
                <FormattedMessage id="savedObjectsManagement.field.onLabel" defaultMessage="On" />
              ) : (
                <FormattedMessage id="savedObjectsManagement.field.offLabel" defaultMessage="Off" />
              )
            }
            checked={!!currentValue}
            onChange={(e) => this.onFieldChange(e.target.checked)}
            disabled={disabled}
            data-test-subj={`savedObjects-editField-${name}`}
          />
        );
      case 'json':
      case 'array':
        return (
          <div data-test-subj={`savedObjects-editField-${name}`}>
            <EuiCodeEditor
              name={`savedObjects-editField-${name}-aceEditor`}
              mode="json"
              theme="textmate"
              value={currentValue}
              onChange={(value: any) => this.onCodeEditorChange(value)}
              width="100%"
              height="auto"
              minLines={6}
              maxLines={30}
              isReadOnly={disabled}
              setOptions={{
                showLineNumbers: true,
                tabSize: 2,
                useSoftTabs: true,
              }}
              editorProps={{
                $blockScrolling: Infinity,
              }}
              showGutter={true}
            />
          </div>
        );
      default:
        return (
          <EuiFieldText
            id={this.fieldId}
            name={name}
            value={currentValue}
            onChange={(e) => this.onFieldChange(e.target.value)}
            disabled={disabled}
            data-test-subj={`savedObjects-editField-${name}`}
          />
        );
    }
  }

  private get fieldId() {
    const { name } = this.props;
    return `savedObjects-editField-${name}`;
  }
}
