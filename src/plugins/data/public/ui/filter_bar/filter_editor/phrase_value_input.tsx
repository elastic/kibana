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

import { EuiFormRow } from '@elastic/eui';
import { InjectedIntl, injectI18n } from '@kbn/i18n/react';
import { uniq } from 'lodash';
import React from 'react';
import { GenericComboBox, GenericComboBoxProps } from './generic_combo_box';
import { PhraseSuggestorUI, PhraseSuggestorProps } from './phrase_suggestor';
import { ValueInputType } from './value_input_type';
import { withKibana } from '../../../../../kibana_react/public';

interface Props extends PhraseSuggestorProps {
  value?: string;
  onChange: (value: string | number | boolean) => void;
  intl: InjectedIntl;
}

class PhraseValueInputUI extends PhraseSuggestorUI<Props> {
  public render() {
    return (
      <EuiFormRow
        label={this.props.intl.formatMessage({
          id: 'data.filter.filterEditor.valueInputLabel',
          defaultMessage: 'Value',
        })}
      >
        {this.isSuggestingValues() ? (
          this.renderWithSuggestions()
        ) : (
          <ValueInputType
            placeholder={this.props.intl.formatMessage({
              id: 'data.filter.filterEditor.valueInputPlaceholder',
              defaultMessage: 'Enter a value',
            })}
            value={this.props.value}
            onChange={this.props.onChange}
            type={this.props.field ? this.props.field.type : 'string'}
          />
        )}
      </EuiFormRow>
    );
  }

  private renderWithSuggestions() {
    const { suggestions } = this.state;
    const { value, intl, onChange } = this.props;
    // there are cases when the value is a number, this would cause an exception
    const valueAsStr = String(value);
    const options = value ? uniq([valueAsStr, ...suggestions]) : suggestions;
    return (
      <StringComboBox
        placeholder={intl.formatMessage({
          id: 'data.filter.filterEditor.valueSelectPlaceholder',
          defaultMessage: 'Select a value',
        })}
        options={options}
        getLabel={option => option}
        selectedOptions={value ? [valueAsStr] : []}
        onChange={([newValue = '']) => onChange(newValue)}
        onSearchChange={this.onSearchChange}
        singleSelection={{ asPlainText: true }}
        onCreateOption={onChange}
        isClearable={false}
        data-test-subj="filterParamsComboBox phraseParamsComboxBox"
      />
    );
  }
}

function StringComboBox(props: GenericComboBoxProps<string>) {
  return GenericComboBox(props);
}

export const PhraseValueInput = injectI18n(withKibana(PhraseValueInputUI));
