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
import { withEuiTheme, WithEuiThemeProps } from '@elastic/eui';
import { calculateWidthFromEntries } from '@kbn/calculate-width-from-char-count';
import { GenericComboBox, GenericComboBoxProps } from './generic_combo_box';
import { PhraseSuggestorUI, PhraseSuggestorProps } from './phrase_suggestor';
import { phrasesValuesComboboxCss } from './phrases_values_input.styles';
import { MIDDLE_TRUNCATION_PROPS } from './lib/helpers';

interface Props {
  values?: string[];
  onChange: (values: string[]) => void;
  onParamsUpdate: (value: string) => void;
  intl: InjectedIntl;
  fullWidth?: boolean;
  compressed?: boolean;
  disabled?: boolean;
}

export type PhrasesValuesInputProps = Props & PhraseSuggestorProps & WithEuiThemeProps;
class PhrasesValuesInputUI extends PhraseSuggestorUI<PhrasesValuesInputProps> {
  public render() {
    const { suggestions, isLoading } = this.state;
    const { values, intl, onChange, fullWidth, onParamsUpdate, compressed, disabled } = this.props;
    const options = values ? uniq([...values, ...suggestions]) : suggestions;
    const panelMinWidth = calculateWidthFromEntries(options);
    return (
      <StringComboBox
        async
        isLoading={isLoading}
        fullWidth={fullWidth}
        compressed={compressed}
        placeholder={intl.formatMessage({
          id: 'unifiedSearch.filter.filterEditor.valuesSelectPlaceholder',
          defaultMessage: 'Select values',
        })}
        aria-label={intl.formatMessage({
          id: 'unifiedSearch.filter.filterEditor.valuesSelectPlaceholder',
          defaultMessage: 'Select values',
        })}
        delimiter=","
        isCaseSensitive={true}
        options={options}
        getLabel={(option) => option}
        selectedOptions={values || []}
        onSearchChange={this.onSearchChange}
        onCreateOption={(option: string) => {
          onParamsUpdate(option.trim());
        }}
        className={phrasesValuesComboboxCss(this.props.theme)}
        onChange={onChange}
        isClearable={false}
        data-test-subj="filterParamsComboBox phrasesParamsComboxBox"
        isDisabled={disabled}
        truncationProps={MIDDLE_TRUNCATION_PROPS}
        inputPopoverProps={{ panelMinWidth, anchorPosition: 'downRight' }}
      />
    );
  }
}

function StringComboBox(props: GenericComboBoxProps<string>) {
  return GenericComboBox(props);
}

export const PhrasesValuesInput = injectI18n(withEuiTheme(withKibana(PhrasesValuesInputUI)));
