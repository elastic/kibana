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

export interface PhrasesSuggestorProps extends PhraseSuggestorProps {
  values?: string[];
  onChange: (values: string[]) => void;
  onParamsUpdate: (value: string) => void;
  intl: InjectedIntl;
  fullWidth?: boolean;
  compressed?: boolean;
}

class PhrasesValuesInputUI extends PhraseSuggestorUI<PhrasesSuggestorProps> {
  public render() {
    const { suggestions } = this.state;
    const { values, intl, onChange, fullWidth, onParamsUpdate, compressed } = this.props;
    const options = values ? uniq([...values, ...suggestions]) : suggestions;
    return (
      <StringComboBox
        fullWidth={fullWidth}
        compressed={compressed}
        placeholder={intl.formatMessage({
          id: 'unifiedSearch.filter.filterEditor.valuesSelectPlaceholder',
          defaultMessage: 'Select values',
        })}
        delimiter=","
        options={options}
        getLabel={(option) => option}
        selectedOptions={values || []}
        onSearchChange={this.onSearchChange}
        onCreateOption={(option: string) => {
          onParamsUpdate(option.trim());
        }}
        onChange={onChange}
        isClearable={false}
        data-test-subj="filterParamsComboBox phrasesParamsComboxBox"
      />
    );
  }
}

function StringComboBox(props: GenericComboBoxProps<string>) {
  return GenericComboBox(props);
}

export const PhrasesValuesInput = injectI18n(withKibana(PhrasesValuesInputUI));
