/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { EuiFormRow } from '@elastic/eui';
import { InjectedIntl, injectI18n } from '@kbn/i18n/react';
import { uniq } from 'lodash';
import React from 'react';
import { GenericComboBox, GenericComboBoxProps } from './generic_combo_box';
import { PhraseSuggestorUI, PhraseSuggestorProps } from './phrase_suggestor';
import { withKibana } from '../../../../../kibana_react/public';

interface Props extends PhraseSuggestorProps {
  values?: string[];
  onChange: (values: string[]) => void;
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
          id: 'data.filter.filterEditor.valuesSelectLabel',
          defaultMessage: 'Values',
        })}
      >
        <StringComboBox
          fullWidth={fullWidth}
          placeholder={intl.formatMessage({
            id: 'data.filter.filterEditor.valuesSelectPlaceholder',
            defaultMessage: 'Select values',
          })}
          options={options}
          getLabel={(option) => option}
          selectedOptions={values || []}
          onSearchChange={this.onSearchChange}
          onCreateOption={(option: string) => onChange([...(values || []), option])}
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
