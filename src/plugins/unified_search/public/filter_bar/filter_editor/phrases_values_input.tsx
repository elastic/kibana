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
import { withKibana } from '@kbn/kibana-react-plugin/public';
import { GenericComboBox, GenericComboBoxProps } from './generic_combo_box';
import { PhraseSuggestorUI, PhraseSuggestorProps } from './phrase_suggestor';

interface Props extends PhraseSuggestorProps {
  values?: string[];
  onChange: (values: string[]) => void;
  onParamsUpdate: (value: string) => void;
  intl: InjectedIntl;
  fullWidth?: boolean;
}

class PhrasesValuesInputUI extends PhraseSuggestorUI<Props> {
  public render() {
    const { suggestions } = this.state;
    const { values, intl, onChange, fullWidth } = this.props;
    const options = values ? uniq([...values, ...suggestions]) : suggestions;
    return (
      <EuiFormRow
        fullWidth={fullWidth}
        label={intl.formatMessage({
          id: 'unifiedSearch.filter.filterEditor.valuesSelectLabel',
          defaultMessage: 'Values',
        })}
      >
        <StringComboBox
          fullWidth={fullWidth}
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
            this.props.onParamsUpdate(option.trim());
          }}
          onChange={onChange}
          isClearable={false}
          data-test-subj="filterParamsComboBox phrasesParamsComboxBox"
        />
      </EuiFormRow>
    );
  }
}

function StringComboBox(props: GenericComboBoxProps<string>) {
  return GenericComboBox(props);
}

export const PhrasesValuesInput = injectI18n(withKibana(PhrasesValuesInputUI));
