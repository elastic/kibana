/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { InjectedIntl, injectI18n } from '@kbn/i18n-react';
import { uniq } from 'lodash';
import React from 'react';
import { withKibana } from '@kbn/kibana-react-plugin/public';
import { GenericComboBox, GenericComboBoxProps } from './generic_combo_box';
import { PhraseSuggestorUI, PhraseSuggestorProps } from './phrase_suggestor';
import { ValueInputType } from './value_input_type';

interface PhraseValueInputProps extends PhraseSuggestorProps {
  value?: string;
  onChange: (value: string | number | boolean) => void;
  intl: InjectedIntl;
  fullWidth?: boolean;
  compressed?: boolean;
  disabled?: boolean;
  isInvalid?: boolean;
}

class PhraseValueInputUI extends PhraseSuggestorUI<PhraseValueInputProps> {
  public render() {
    return (
      <>
        {this.isSuggestingValues() ? (
          this.renderWithSuggestions()
        ) : (
          <ValueInputType
            disabled={this.props.disabled}
            compressed={this.props.compressed}
            fullWidth={this.props.fullWidth}
            placeholder={this.props.intl.formatMessage({
              id: 'unifiedSearch.filter.filterEditor.valueInputPlaceholder',
              defaultMessage: 'Enter a value',
            })}
            value={this.props.value}
            onChange={this.props.onChange}
            field={this.props.field}
            isInvalid={this.props.isInvalid}
          />
        )}
      </>
    );
  }

  private renderWithSuggestions() {
    const { suggestions } = this.state;
    const { value, intl, onChange, fullWidth } = this.props;
    // there are cases when the value is a number, this would cause an exception
    const valueAsStr = String(value);
    const options = value ? uniq([valueAsStr, ...suggestions]) : suggestions;
    return (
      <StringComboBox
        isDisabled={this.props.disabled}
        fullWidth={fullWidth}
        compressed={this.props.compressed}
        placeholder={intl.formatMessage({
          id: 'unifiedSearch.filter.filterEditor.valueSelectPlaceholder',
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
