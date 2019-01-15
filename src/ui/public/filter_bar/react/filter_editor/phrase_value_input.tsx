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
import { ValueInputType } from './value_input_type';

interface Props extends PhraseSuggestorProps {
  value?: string;
  onChange: (value: string | number | boolean, isInvalid: boolean) => void;
  refCallback: (element: HTMLElement) => void;
  intl: InjectedIntl;
}

class PhraseValueInputUI extends PhraseSuggestor<Props> {
  public render() {
    return (
      <EuiFormRow
        label={this.props.intl.formatMessage({
          id: 'common.ui.filterEditor.valueInputLabel',
          defaultMessage: 'Value',
        })}
      >
        {this.isSuggestingValues() ? (
          this.renderWithSuggestions()
        ) : (
          <ValueInputType
            placeholder={this.props.intl.formatMessage({
              id: 'common.ui.filterEditor.valueInputPlaceholder',
              defaultMessage: 'Enter a value',
            })}
            value={this.props.value}
            onChange={this.props.onChange}
            type={this.props.field ? this.props.field.type : 'string'}
            refCallback={this.props.refCallback}
          />
        )}
      </EuiFormRow>
    );
  }

  private renderWithSuggestions() {
    const options = this.getOptions();
    const selectedOptions = this.getSelectedOptions(options);
    return (
      <EuiComboBox
        placeholder={this.props.intl.formatMessage({
          id: 'common.ui.filterEditor.valueSelectPlaceholder',
          defaultMessage: 'Select a value',
        })}
        options={options}
        selectedOptions={selectedOptions}
        onChange={this.onComboBoxChange}
        onSearchChange={this.onSearchChange}
        singleSelection={{ asPlainText: true }}
        onCreateOption={this.props.onChange}
        isClearable={false}
        inputRef={this.props.refCallback}
      />
    );
  }

  private onComboBoxChange = (selectedOptions: EuiComboBoxOptionProps[]): void => {
    if (selectedOptions.length === 0) {
      return this.props.onChange('', true);
    }
    const [selectedOption] = selectedOptions;
    this.props.onChange(selectedOption.label, false);
  };

  private getOptions() {
    const options = [...this.state.suggestions];
    if (typeof this.props.value !== 'undefined') {
      options.unshift(this.props.value);
    }
    return uniq(options).map(label => ({ label }));
  }

  private getSelectedOptions(options: EuiComboBoxOptionProps[]): EuiComboBoxOptionProps[] {
    return options.filter(option => {
      return typeof this.props.value !== 'undefined' && option.label === this.props.value;
    });
  }
}

export const PhraseValueInput = injectI18n(PhraseValueInputUI);
