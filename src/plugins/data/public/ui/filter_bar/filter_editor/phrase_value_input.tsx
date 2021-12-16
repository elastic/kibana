/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { EuiFormRow } from '@elastic/eui';
import { InjectedIntl, injectI18n } from '@kbn/i18n-react';
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
  fullWidth?: boolean;
  disabled?: boolean;
  compressed?: boolean;
}

class PhraseValueInputUI extends PhraseSuggestorUI<Props> {
  public render() {
    return (
      <EuiFormRow fullWidth={this.props.fullWidth}>
        {this.isSuggestingValues() ? (
          this.renderWithSuggestions()
        ) : (
          <ValueInputType
            compressed
            fullWidth={this.props.fullWidth}
            disabled={this.props.disabled}
            placeholder={this.props.intl.formatMessage({
              id: 'data.filter.filterEditor.valueInputPlaceholder',
              defaultMessage: 'Value(s)',
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
    const { value, intl, onChange, fullWidth, disabled, compressed } = this.props;
    // there are cases when the value is a number, this would cause an exception
    const valueAsStr = String(value);
    const options = value ? uniq([valueAsStr, ...suggestions]) : suggestions;
    return (
      <StringComboBox
        compressed={compressed}
        fullWidth={fullWidth}
        disabled={disabled}
        placeholder={intl.formatMessage({
          id: 'data.filter.filterEditor.valueSelectPlaceholder',
          defaultMessage: 'Select a value',
        })}
        options={options}
        getLabel={(option) => option}
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
