/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { Component, ChangeEvent } from 'react';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n/react';
import {
  htmlIdGenerator,
  EuiComboBox,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFormRow,
  EuiFieldText,
  EuiLink,
} from '@elastic/eui';
import type { EuiComboBoxOptionOption } from '@elastic/eui';
import type { Series } from '../../../common/types';
import { durationOutputOptions, durationInputOptions, isDuration } from './lib/durations';

enum DATA_FORMATTERS {
  BYTES = 'bytes',
  NUMBER = 'number',
  PERCENT = 'percent',
  DURATION = 'duration',
  CUSTOM = 'custom',
}
const DEFAULT_OUTPUT_PRECISION = '2';

const dataFormatPickerOptions = [
  {
    label: i18n.translate('visTypeTimeseries.dataFormatPicker.bytesLabel', {
      defaultMessage: 'Bytes',
    }),
    value: DATA_FORMATTERS.BYTES,
  },
  {
    label: i18n.translate('visTypeTimeseries.dataFormatPicker.numberLabel', {
      defaultMessage: 'Number',
    }),
    value: DATA_FORMATTERS.NUMBER,
  },
  {
    label: i18n.translate('visTypeTimeseries.dataFormatPicker.percentLabel', {
      defaultMessage: 'Percent',
    }),
    value: DATA_FORMATTERS.PERCENT,
  },
  {
    label: i18n.translate('visTypeTimeseries.dataFormatPicker.durationLabel', {
      defaultMessage: 'Duration',
    }),
    value: DATA_FORMATTERS.DURATION,
  },
  {
    label: i18n.translate('visTypeTimeseries.dataFormatPicker.customLabel', {
      defaultMessage: 'Custom',
    }),
    value: DATA_FORMATTERS.CUSTOM,
  },
];

interface DataFormatPickerProps {
  value: string;
  onChange: (partialModel: Partial<Series>) => void;
  disabled?: boolean;
}

interface DataFormatPickerState {
  from?: string;
  to?: string;
  decimals?: string;
}

export class DataFormatPicker extends Component<DataFormatPickerProps, DataFormatPickerState> {
  constructor(props: DataFormatPickerProps) {
    super(props);
    const [from, to, decimals] =
      props.value && isDuration(props.value) ? props.value.split(',') : ['ms', 'ms', ''];

    this.state = {
      from,
      to,
      decimals,
    };
  }

  updateDuration = () => {
    const { from, to, decimals } = this.state;
    this.props.onChange({ formatter: `${from},${to},${decimals}` });
  };

  handleChange = ([{ value: selectedOptionValue }]: Array<EuiComboBoxOptionOption<string>>) => {
    if (!selectedOptionValue) {
      return;
    }

    if (selectedOptionValue === DATA_FORMATTERS.DURATION) {
      this.updateDuration();
    } else {
      this.props.onChange({ formatter: selectedOptionValue });
    }
  };

  handleDurationOptionsChange = (optionName: string, value: string) =>
    this.setState(
      {
        [optionName]: value,
      },
      this.updateDuration
    );

  handleDurationChange(optionName: 'from' | 'to') {
    return ([{ value: selectedOptionValue }]: Array<EuiComboBoxOptionOption<string>>) => {
      if (selectedOptionValue) {
        this.handleDurationOptionsChange(optionName, selectedOptionValue);
      }
    };
  }

  handleDecimalsChange = (event: ChangeEvent<HTMLInputElement>) =>
    this.handleDurationOptionsChange('decimals', event.target.value);

  handleCustomChange = (event: ChangeEvent<HTMLInputElement>) => {
    this.props.onChange({ formatter: event.target.value });
  };

  render() {
    const htmlId = htmlIdGenerator();
    const value = this.props.value || '';
    let defaultValue = value;
    const isCustomFormatter = ![
      DATA_FORMATTERS.BYTES,
      DATA_FORMATTERS.NUMBER,
      DATA_FORMATTERS.PERCENT,
    ].includes(value as DATA_FORMATTERS);

    let custom;
    let duration;

    if (isCustomFormatter) {
      defaultValue = DATA_FORMATTERS.CUSTOM;
      custom = (
        <EuiFlexItem grow={false}>
          <EuiFormRow
            label={i18n.translate('visTypeTimeseries.dataFormatPicker.formatStringLabel', {
              defaultMessage: 'Format string',
            })}
            helpText={
              <span>
                <FormattedMessage
                  id="visTypeTimeseries.dataFormatPicker.formatStringHelpText"
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
            <EuiFieldText onChange={this.handleCustomChange} disabled={this.props.disabled} />
          </EuiFormRow>
        </EuiFlexItem>
      );
    }

    if (isDuration(value)) {
      defaultValue = DATA_FORMATTERS.DURATION;
      const [from, to, decimals = DEFAULT_OUTPUT_PRECISION] = value.split(',');
      const selectedFrom = durationInputOptions.find((option) => from === option.value);
      const selectedTo = durationOutputOptions.find((option) => to === option.value);

      duration = (
        <>
          <EuiFlexItem grow={false}>
            <EuiFormRow
              id={htmlId('from')}
              label={i18n.translate('visTypeTimeseries.dataFormatPicker.fromLabel', {
                defaultMessage: 'From',
              })}
            >
              <EuiComboBox
                isClearable={false}
                options={durationInputOptions}
                selectedOptions={selectedFrom ? [selectedFrom] : []}
                onChange={this.handleDurationChange('from')}
                singleSelection={{ asPlainText: true }}
                isDisabled={this.props.disabled}
              />
            </EuiFormRow>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiFormRow
              id={htmlId('to')}
              label={i18n.translate('visTypeTimeseries.dataFormatPicker.toLabel', {
                defaultMessage: 'To',
              })}
            >
              <EuiComboBox
                isClearable={false}
                options={durationOutputOptions}
                selectedOptions={selectedTo ? [selectedTo] : []}
                onChange={this.handleDurationChange('to')}
                singleSelection={{ asPlainText: true }}
                isDisabled={this.props.disabled}
              />
            </EuiFormRow>
          </EuiFlexItem>

          {selectedTo?.value !== 'humanize' && (
            <EuiFlexItem grow={false}>
              <EuiFormRow
                id={htmlId('decimal')}
                label={i18n.translate('visTypeTimeseries.dataFormatPicker.decimalPlacesLabel', {
                  defaultMessage: 'Decimal places',
                })}
              >
                <EuiFieldText
                  defaultValue={decimals}
                  placeholder={DEFAULT_OUTPUT_PRECISION}
                  onChange={this.handleDecimalsChange}
                  disabled={this.props.disabled}
                />
              </EuiFormRow>
            </EuiFlexItem>
          )}
        </>
      );
    }

    const selectedOption = dataFormatPickerOptions.find((option) => defaultValue === option.value);

    return (
      <EuiFlexGroup responsive={false} gutterSize="s">
        <EuiFlexItem grow={false}>
          <EuiFormRow
            label={i18n.translate('visTypeTimeseries.defaultDataFormatterLabel', {
              defaultMessage: 'Data Formatter',
            })}
          >
            <EuiComboBox
              isClearable={false}
              options={dataFormatPickerOptions}
              selectedOptions={selectedOption ? [selectedOption] : []}
              onChange={this.handleChange}
              singleSelection={{ asPlainText: true }}
              data-test-subj="tsvbDataFormatPicker"
              isDisabled={this.props.disabled}
            />
          </EuiFormRow>
        </EuiFlexItem>
        {duration ?? custom}
      </EuiFlexGroup>
    );
  }
}
