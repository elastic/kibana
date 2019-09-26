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
import { PhraseSuggestor, PhraseSuggestorProps } from './phrase_suggestor';

interface Props extends PhraseSuggestorProps {
  values?: string[];
  onChange: (values: string[]) => void;
  intl: InjectedIntl;
}

class PhrasesValuesInputUI extends PhraseSuggestor<Props> {
  public render() {
    const { suggestions } = this.state;
    const { values, intl, onChange } = this.props;
    const options = values ? uniq([...values, ...suggestions]) : suggestions;
    return (
      <EuiFormRow
        label={intl.formatMessage({
          id: 'data.filter.filterEditor.valuesSelectLabel',
          defaultMessage: 'Values',
        })}
      >
        <StringComboBox
          placeholder={intl.formatMessage({
            id: 'data.filter.filterEditor.valuesSelectPlaceholder',
            defaultMessage: 'Select values',
          })}
          options={options}
          getLabel={option => option}
          selectedOptions={values || []}
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

export const PhrasesValuesInput = injectI18n(PhrasesValuesInputUI);
