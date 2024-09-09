/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { InjectedIntl, injectI18n } from '@kbn/i18n-react';
import { uniq } from 'lodash';
import React from 'react';
import { withKibana } from '@kbn/kibana-react-plugin/public';
import { calculateWidthFromEntries } from '@kbn/calculate-width-from-char-count';
import { GenericComboBox, GenericComboBoxProps } from './generic_combo_box';
import { PhraseSuggestorUI, PhraseSuggestorProps } from './phrase_suggestor';
import { ValueInputType } from './value_input_type';
import { MIDDLE_TRUNCATION_PROPS, SINGLE_SELECTION_AS_TEXT_PROPS } from './lib/helpers';

interface PhraseValueInputProps extends PhraseSuggestorProps {
  value?: string;
  onChange: (value: string | number | boolean) => void;
  onBlur?: (value: string | number | boolean) => void;
  intl: InjectedIntl;
  fullWidth?: boolean;
  compressed?: boolean;
  disabled?: boolean;
  invalid?: boolean;
}

class PhraseValueInputUI extends PhraseSuggestorUI<PhraseValueInputProps> {
  inputRef: HTMLInputElement | null = null;

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
            onBlur={this.props.onBlur}
            value={this.props.value}
            onChange={this.props.onChange}
            field={this.props.field}
            isInvalid={this.props.invalid}
          />
        )}
      </>
    );
  }

  private renderWithSuggestions() {
    const { suggestions, isLoading } = this.state;
    const { value, intl, onChange, fullWidth } = this.props;
    // there are cases when the value is a number, this would cause an exception
    const valueAsStr = String(value);
    const options = value ? uniq([valueAsStr, ...suggestions]) : suggestions;
    const panelMinWidth = calculateWidthFromEntries(options);
    return (
      <StringComboBox
        async
        isLoading={isLoading}
        inputRef={(ref) => {
          this.inputRef = ref;
        }}
        isDisabled={this.props.disabled}
        fullWidth={fullWidth}
        compressed={this.props.compressed}
        placeholder={intl.formatMessage({
          id: 'unifiedSearch.filter.filterEditor.valueSelectPlaceholder',
          defaultMessage: 'Select a value',
        })}
        aria-label={intl.formatMessage({
          id: 'unifiedSearch.filter.filterEditor.valueSelectPlaceholder',
          defaultMessage: 'Select a value',
        })}
        options={options}
        getLabel={(option) => option}
        selectedOptions={value ? [valueAsStr] : []}
        onChange={([newValue = '']) => {
          onChange(newValue);
        }}
        onSearchChange={this.onSearchChange}
        onCreateOption={onChange}
        isClearable={false}
        data-test-subj="filterParamsComboBox phraseParamsComboxBox"
        singleSelection={SINGLE_SELECTION_AS_TEXT_PROPS}
        truncationProps={MIDDLE_TRUNCATION_PROPS}
        inputPopoverProps={{ panelMinWidth, anchorPosition: 'downRight' }}
      />
    );
  }
}

function StringComboBox(props: GenericComboBoxProps<string>) {
  return GenericComboBox(props);
}

export const PhraseValueInput = injectI18n(withKibana(PhraseValueInputUI));
