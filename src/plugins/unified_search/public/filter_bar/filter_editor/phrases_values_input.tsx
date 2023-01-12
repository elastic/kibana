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
import { EuiFlexGroup, EuiFlexItem, withEuiTheme, WithEuiThemeProps } from '@elastic/eui';
import { GenericComboBox, GenericComboBoxProps } from './generic_combo_box';
import { PhraseSuggestorUI, PhraseSuggestorProps } from './phrase_suggestor';
import { TruncatedLabel } from './truncated_label';
import { phrasesValuesComboboxCss } from './phrases_values_input.styles';

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

const DEFAULT_COMBOBOX_WIDTH = 250;
const COMBOBOX_PADDINGS = 20;
const DEFAULT_FONT = '14px Inter';

class PhrasesValuesInputUI extends PhraseSuggestorUI<PhrasesValuesInputProps> {
  comboBoxRef: React.RefObject<HTMLInputElement>;

  constructor(props: PhrasesValuesInputProps) {
    super(props);
    this.comboBoxRef = React.createRef();
  }

  public render() {
    const { suggestions } = this.state;
    const { values, intl, onChange, fullWidth, onParamsUpdate, compressed, disabled } = this.props;
    const options = values ? uniq([...values, ...suggestions]) : suggestions;

    return (
      <div ref={this.comboBoxRef}>
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
          className={phrasesValuesComboboxCss(this.props.theme)}
          onChange={onChange}
          isClearable={false}
          data-test-subj="filterParamsComboBox phrasesParamsComboxBox"
          isDisabled={disabled}
          renderOption={(option, searchValue) => (
            <EuiFlexGroup gutterSize="s" alignItems="center" responsive={false}>
              <EuiFlexItem>
                <TruncatedLabel
                  defaultComboboxWidth={DEFAULT_COMBOBOX_WIDTH}
                  defaultFont={DEFAULT_FONT}
                  comboboxPaddings={COMBOBOX_PADDINGS}
                  comboBoxRef={this.comboBoxRef}
                  label={option.label}
                  search={searchValue}
                />
              </EuiFlexItem>
            </EuiFlexGroup>
          )}
        />
      </div>
    );
  }
}

function StringComboBox(props: GenericComboBoxProps<string>) {
  return GenericComboBox(props);
}

export const PhrasesValuesInput = injectI18n(withEuiTheme(withKibana(PhrasesValuesInputUI)));
