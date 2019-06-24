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

import PropTypes from 'prop-types';
import React, { Component } from 'react';
import _ from 'lodash';
import {
  htmlIdGenerator,
  EuiComboBox,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFormRow,
  EuiFieldText,
  EuiLink,
} from '@elastic/eui';
import { durationOutputOptions, durationInputOptions, isDuration } from './lib/durations';
import { i18n } from '@kbn/i18n';
import { FormattedMessage, injectI18n } from '@kbn/i18n/react';

const DEFAULT_OUTPUT_PRECISION = '2';

class DataFormatPickerUI extends Component {
  constructor(props) {
    super(props);

    let from;
    let to;
    let decimals;

    if (isDuration(props.value)) {
      [from, to, decimals] = props.value.split(',');
    }

    this.state = {
      from: from || 'ms',
      to: to || 'ms',
      decimals: decimals || '',
    };
  }

  handleCustomChange = () => {
    this.props.onChange([{ value: (this.custom && this.custom.value) || '' }]);
  };

  handleChange = selectedOptions => {
    if (selectedOptions.length < 1) {
      return;
    }

    if (selectedOptions[0].value === 'custom') {
      this.handleCustomChange();
    } else if (selectedOptions[0].value === 'duration') {
      const { from, to, decimals } = this.state;
      this.props.onChange([
        {
          value: `${from},${to},${decimals}`,
        },
      ]);
    } else {
      this.props.onChange(selectedOptions);
    }
  };

  handleDurationChange(name) {
    return selectedOptions => {
      if (selectedOptions.length < 1) {
        return;
      }

      let newValue;
      if (name === 'decimals') {
        newValue = this.decimals.value;
      } else {
        newValue = selectedOptions[0].value;
      }

      this.setState(
        {
          [name]: newValue,
        },
        () => {
          const { from, to, decimals } = this.state;
          this.props.onChange([
            {
              value: `${from},${to},${decimals}`,
            },
          ]);
        }
      );
    };
  }

  render() {
    const htmlId = htmlIdGenerator();
    const value = this.props.value || '';
    let defaultValue = value;
    if (!_.includes(['bytes', 'number', 'percent'], value)) {
      defaultValue = 'custom';
    }
    if (isDuration(value)) {
      defaultValue = 'duration';
    }
    const { intl } = this.props;
    const options = [
      {
        label: intl.formatMessage({
          id: 'tsvb.dataFormatPicker.bytesLabel',
          defaultMessage: 'Bytes',
        }),
        value: 'bytes',
      },
      {
        label: intl.formatMessage({
          id: 'tsvb.dataFormatPicker.numberLabel',
          defaultMessage: 'Number',
        }),
        value: 'number',
      },
      {
        label: intl.formatMessage({
          id: 'tsvb.dataFormatPicker.percentLabel',
          defaultMessage: 'Percent',
        }),
        value: 'percent',
      },
      {
        label: intl.formatMessage({
          id: 'tsvb.dataFormatPicker.durationLabel',
          defaultMessage: 'Duration',
        }),
        value: 'duration',
      },
      {
        label: intl.formatMessage({
          id: 'tsvb.dataFormatPicker.customLabel',
          defaultMessage: 'Custom',
        }),
        value: 'custom',
      },
    ];
    const selectedOption = options.find(option => {
      return defaultValue === option.value;
    });

    let custom;
    if (defaultValue === 'duration') {
      const [from, to, decimals] = value.split(',');
      const selectedFrom = durationInputOptions.find(option => from === option.value);
      const selectedTo = durationOutputOptions.find(option => to === option.value);

      return (
        <EuiFlexGroup responsive={false} gutterSize="s">
          <EuiFlexItem grow={false}>
            <EuiFormRow id={htmlId('date')} label={this.props.label}>
              <EuiComboBox
                isClearable={false}
                options={options}
                selectedOptions={selectedOption ? [selectedOption] : []}
                onChange={this.handleChange}
                singleSelection={{ asPlainText: true }}
              />
            </EuiFormRow>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiFormRow
              id={htmlId('from')}
              label={
                <FormattedMessage id="tsvb.dataFormatPicker.fromLabel" defaultMessage="From" />
              }
            >
              <EuiComboBox
                isClearable={false}
                options={durationInputOptions}
                selectedOptions={selectedFrom ? [selectedFrom] : []}
                onChange={this.handleDurationChange('from')}
                singleSelection={{ asPlainText: true }}
              />
            </EuiFormRow>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiFormRow
              id={htmlId('to')}
              label={<FormattedMessage id="tsvb.dataFormatPicker.toLabel" defaultMessage="To" />}
            >
              <EuiComboBox
                isClearable={false}
                options={durationOutputOptions}
                selectedOptions={selectedTo ? [selectedTo] : []}
                onChange={this.handleDurationChange('to')}
                singleSelection={{ asPlainText: true }}
              />
            </EuiFormRow>
          </EuiFlexItem>

          {selectedTo && selectedTo.value !== 'humanize' && (
            <EuiFlexItem grow={false}>
              <EuiFormRow
                id={htmlId('decimal')}
                label={
                  <FormattedMessage
                    id="tsvb.dataFormatPicker.decimalPlacesLabel"
                    defaultMessage="Decimal places"
                  />
                }
              >
                <EuiFieldText
                  defaultValue={decimals}
                  inputRef={el => (this.decimals = el)}
                  placeholder={DEFAULT_OUTPUT_PRECISION}
                  onChange={this.handleDurationChange('decimals')}
                />
              </EuiFormRow>
            </EuiFlexItem>
          )}
        </EuiFlexGroup>
      );
    }
    if (defaultValue === 'custom') {
      custom = (
        <EuiFlexItem grow={false}>
          <EuiFormRow
            label={
              <FormattedMessage
                id="tsvb.dataFormatPicker.formatStringLabel"
                defaultMessage="Format string"
              />
            }
            helpText={
              <span>
                <FormattedMessage
                  id="tsvb.dataFormatPicker.formatStringHelpText"
                  defaultMessage="See {numeralJsLink}"
                  values={{
                    numeralJsLink: (
                      <EuiLink href="http://numeraljs.com/#format" target="_BLANK">
                        Numeral.js
                      </EuiLink>
                    ),
                  }}
                />
              </span>
            }
          >
            <EuiFieldText
              defaultValue={value}
              inputRef={el => (this.custom = el)}
              onChange={this.handleCustomChange}
            />
          </EuiFormRow>
        </EuiFlexItem>
      );
    }
    return (
      <EuiFlexGroup responsive={false} gutterSize="s">
        <EuiFlexItem grow={false}>
          <EuiFormRow label={this.props.label}>
            <EuiComboBox
              isClearable={false}
              options={options}
              selectedOptions={selectedOption ? [selectedOption] : []}
              onChange={this.handleChange}
              singleSelection={{ asPlainText: true }}
            />
          </EuiFormRow>
        </EuiFlexItem>
        {custom}
      </EuiFlexGroup>
    );
  }
}

DataFormatPickerUI.defaultProps = {
  label: i18n.translate('tsvb.defaultDataFormatterLabel', { defaultMessage: 'Data Formatter' }),
};

DataFormatPickerUI.propTypes = {
  value: PropTypes.string,
  label: PropTypes.string,
  onChange: PropTypes.func,
};

export const DataFormatPicker = injectI18n(DataFormatPickerUI);
