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
import React, { Component } from 'react';
import { IndexPattern } from 'ui/index_patterns';

interface Props {
  value?: IndexPattern;
  options: IndexPattern[];
  onChange: (value?: IndexPattern) => void;
  intl: InjectedIntl;
  refCallback: (element: HTMLElement) => void;
}

class IndexPatternInputUI extends Component<Props> {
  public render() {
    const options = this.getOptions();
    const selectedOptions = this.getSelectedOptions(options);
    return (
      <EuiFormRow
        label={this.props.intl.formatMessage({
          id: 'common.ui.filterEditor.indexPatternSelectLabel',
          defaultMessage: 'Index Pattern',
        })}
      >
        <EuiComboBox
          placeholder={this.props.intl.formatMessage({
            id: 'common.ui.filterBar.indexPatternSelectPlaceholder',
            defaultMessage: 'Select an index pattern',
          })}
          options={options}
          selectedOptions={selectedOptions}
          onChange={this.onChange}
          singleSelection={{ asPlainText: true }}
          isClearable={false}
          inputRef={this.props.refCallback}
        />
      </EuiFormRow>
    );
  }

  private getOptions(): EuiComboBoxOptionProps[] {
    return this.props.options.map(indexPattern => ({ label: indexPattern.title }));
  }

  private getSelectedOptions(options: EuiComboBoxOptionProps[]): EuiComboBoxOptionProps[] {
    return options.filter(option => {
      return typeof this.props.value !== 'undefined' && option.label === this.props.value.title;
    });
  }

  private onChange = (selectedOptions: EuiComboBoxOptionProps[]): void => {
    if (selectedOptions.length === 0) {
      return this.props.onChange(undefined);
    }
    const [selectedOption] = selectedOptions;
    const indexPattern = this.props.options.find(option => option.title === selectedOption.label);
    this.props.onChange(indexPattern);
  };
}

export const IndexPatternInput = injectI18n(IndexPatternInputUI);
