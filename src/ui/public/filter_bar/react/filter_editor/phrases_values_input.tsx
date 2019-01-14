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

import { EuiComboBox, EuiComboBoxOptionProps, EuiFormRow } from '@elastic/eui';
import { InjectedIntl, injectI18n } from '@kbn/i18n/react';
import { uniq } from 'lodash';
import React from 'react';
import { PhraseSuggestor, PhraseSuggestorProps } from './phrase_suggestor';

interface Props extends PhraseSuggestorProps {
  values?: string[];
  onChange: (values: string[], isInvalid: boolean) => void;
  intl: InjectedIntl;
  refCallback: (element: HTMLElement) => void;
}

class PhrasesValuesInputUI extends PhraseSuggestor<Props> {
  public render() {
    const options = this.getOptions();
    const selectedOptions = this.getSelectedOptions(options);
    return (
      <EuiFormRow
        label={this.props.intl.formatMessage({
          id: 'common.ui.filterEditor.valuesSelectLabel',
          defaultMessage: 'Values',
        })}
      >
        <EuiComboBox
          placeholder={this.props.intl.formatMessage({
            id: 'common.ui.filterEditor.valuesSelectPlaceholder',
            defaultMessage: 'Select values',
          })}
          options={options}
          selectedOptions={selectedOptions}
          onCreateOption={this.onAdd}
          onChange={this.onChange}
          isClearable={false}
          inputRef={this.props.refCallback}
        />
      </EuiFormRow>
    );
  }

  private getOptions(): EuiComboBoxOptionProps[] {
    const options = [...(this.props.values || []), ...this.state.suggestions];
    return uniq(options).map(label => ({ label }));
  }

  private getSelectedOptions(options: EuiComboBoxOptionProps[]): EuiComboBoxOptionProps[] {
    return options.filter(option => {
      return (this.props.values || []).includes(option.label);
    });
  }

  private onAdd = (value: string) => {
    const values = this.props.values || [];
    this.props.onChange([...values, value], false);
  };

  private onChange = (selectedOptions: EuiComboBoxOptionProps[]) => {
    this.props.onChange(selectedOptions.map(option => option.label), selectedOptions.length === 0);
  };
}

export const PhrasesValuesInput = injectI18n(PhrasesValuesInputUI);
