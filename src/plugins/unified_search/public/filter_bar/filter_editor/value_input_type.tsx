/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { EuiFieldNumber, EuiFieldText, EuiSelect } from '@elastic/eui';
import { InjectedIntl, injectI18n } from '@kbn/i18n-react';
import { isEmpty } from 'lodash';
import React, { Component } from 'react';
import type { DataViewField } from '@kbn/data-views-plugin/common';
import { validateParams } from './lib/filter_editor_utils';

interface Props {
  value?: string | number;
  field: DataViewField;
  onChange: (value: string | number | boolean) => void;
  onBlur?: (value: string | number | boolean) => void;
  placeholder: string;
  intl: InjectedIntl;
  controlOnly?: boolean;
  className?: string;
  fullWidth?: boolean;
  isInvalid?: boolean;
  compressed?: boolean;
  disabled?: boolean;
  dataTestSubj?: string;
}

class ValueInputTypeUI extends Component<Props> {
  private getValueForNumberField = (value?: string | number): string | number | undefined => {
    if (typeof value === 'string') {
      const parsedValue = parseFloat(value);
      return isNaN(parsedValue) ? value : parsedValue;
    }
    return value;
  };

  public render() {
    const value = this.props.value ?? '';
    const type = this.props.field?.type ?? 'string';
    let inputElement: React.ReactNode;
    switch (type) {
      case 'string':
        inputElement = (
          <EuiFieldText
            compressed={this.props.compressed}
            disabled={this.props.disabled}
            fullWidth={this.props.fullWidth}
            placeholder={this.props.placeholder}
            aria-label={this.props.placeholder}
            value={value}
            onChange={this.onChange}
            isInvalid={!validateParams(value, this.props.field)}
            controlOnly={this.props.controlOnly}
            className={this.props.className}
            data-test-subj={this.props.dataTestSubj}
          />
        );
        break;
      case 'number':
      case 'number_range':
        inputElement = (
          <EuiFieldNumber
            compressed={this.props.compressed}
            disabled={this.props.disabled}
            fullWidth={this.props.fullWidth}
            placeholder={this.props.placeholder}
            aria-label={this.props.placeholder}
            value={this.getValueForNumberField(value)}
            onChange={this.onChange}
            controlOnly={this.props.controlOnly}
            className={this.props.className}
            data-test-subj={this.props.dataTestSubj}
          />
        );
        break;
      case 'date':
      case 'date_range':
        inputElement = (
          <EuiFieldText
            compressed={this.props.compressed}
            disabled={this.props.disabled}
            fullWidth={this.props.fullWidth}
            placeholder={this.props.placeholder}
            aria-label={this.props.placeholder}
            value={value}
            onChange={this.onChange}
            onBlur={this.onBlur}
            isInvalid={this.props.isInvalid}
            controlOnly={this.props.controlOnly}
            className={this.props.className}
            data-test-subj={this.props.dataTestSubj}
          />
        );
        break;
      case 'ip':
      case 'ip_range':
        inputElement = (
          <EuiFieldText
            fullWidth={this.props.fullWidth}
            disabled={this.props.disabled}
            placeholder={this.props.placeholder}
            aria-label={this.props.placeholder}
            value={value}
            onChange={this.onChange}
            isInvalid={!isEmpty(value) && !validateParams(value, this.props.field)}
            controlOnly={this.props.controlOnly}
            className={this.props.className}
            compressed={this.props.compressed}
            data-test-subj={this.props.dataTestSubj}
          />
        );
        break;
      case 'boolean':
        inputElement = (
          <EuiSelect
            options={[
              { value: undefined, text: this.props.placeholder },
              {
                value: 'true',
                text: this.props.intl.formatMessage({
                  id: 'unifiedSearch.filter.filterEditor.trueOptionLabel',
                  defaultMessage: 'true',
                }),
              },
              {
                value: 'false',
                text: this.props.intl.formatMessage({
                  id: 'unifiedSearch.filter.filterEditor.falseOptionLabel',
                  defaultMessage: 'false',
                }),
              },
            ]}
            value={value}
            onChange={this.onBoolChange}
            aria-label={this.props.placeholder}
            className={this.props.className}
            fullWidth={this.props.fullWidth}
            compressed={this.props.compressed}
            data-test-subj={this.props.dataTestSubj}
          />
        );
        break;
      default:
        break;
    }

    return inputElement;
  }

  private onBoolChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    const boolValue = event.target.value === 'true';
    this.props.onChange(boolValue);
  };

  private onChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const params = event.target.value;
    this.props.onChange(params);
  };

  private onBlur = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (this.props.onBlur) {
      const params = event.target.value;
      this.props.onBlur(params);
    }
  };
}

export const ValueInputType = injectI18n(ValueInputTypeUI);
