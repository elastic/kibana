/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { useEffect, useMemo, useCallback, useState, ChangeEvent } from 'react';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import type { EuiComboBoxOptionOption } from '@elastic/eui';
import {
  htmlIdGenerator,
  EuiComboBox,
  EuiFieldText,
  EuiFlexItem,
  EuiFormRow,
  EuiLink,
  EuiSuperSelect,
  EuiText,
  EuiCode,
} from '@elastic/eui';
import { DATA_FORMATTERS } from '../../../common/enums';
import { getFormatterType } from './lib/get_formatter_type';
import { durationInputOptions, durationOutputOptions, getDurationParams } from './lib/durations';

const DEFAULT_OUTPUT_PRECISION = '2';
const DEFAULT_CUSTOM_FORMAT_PATTERN = '0,0.[000]';

const defaultOptionLabel = i18n.translate('visTypeTimeseries.dataFormatPicker.defaultLabel', {
  defaultMessage: 'Default',
});

const getDataFormatPickerOptions = (
  shouldIncludeDefaultOption: boolean,
  shouldIncludeNumberOptions: boolean
) => {
  const additionalOptions = [];

  if (shouldIncludeDefaultOption) {
    additionalOptions.push({
      value: DATA_FORMATTERS.DEFAULT,
      inputDisplay: defaultOptionLabel,
      dropdownDisplay: (
        <>
          <span>{defaultOptionLabel}</span>
          <EuiText size="s" color="subdued">
            <p className="euiTextColor--subdued">
              {i18n.translate('visTypeTimeseries.dataFormatPicker.defaultLabelDescription', {
                defaultMessage: 'Applies common formatting',
              })}
            </p>
          </EuiText>
        </>
      ),
      'data-test-subj': `tsvbDataFormatPicker-${DATA_FORMATTERS.DEFAULT}`,
    });
  }

  if (shouldIncludeNumberOptions) {
    additionalOptions.push(
      {
        value: DATA_FORMATTERS.NUMBER,
        inputDisplay: i18n.translate('visTypeTimeseries.dataFormatPicker.numberLabel', {
          defaultMessage: 'Number',
        }),
        'data-test-subj': `tsvbDataFormatPicker-${DATA_FORMATTERS.NUMBER}`,
      },
      {
        value: DATA_FORMATTERS.BYTES,
        inputDisplay: i18n.translate('visTypeTimeseries.dataFormatPicker.bytesLabel', {
          defaultMessage: 'Bytes',
        }),
        'data-test-subj': `tsvbDataFormatPicker-${DATA_FORMATTERS.BYTES}`,
      },
      {
        value: DATA_FORMATTERS.PERCENT,
        inputDisplay: i18n.translate('visTypeTimeseries.dataFormatPicker.percentLabel', {
          defaultMessage: 'Percent',
        }),
        'data-test-subj': `tsvbDataFormatPicker-${DATA_FORMATTERS.PERCENT}`,
      },
      {
        value: DATA_FORMATTERS.DURATION,
        inputDisplay: i18n.translate('visTypeTimeseries.dataFormatPicker.durationLabel', {
          defaultMessage: 'Duration',
        }),
        'data-test-subj': `tsvbDataFormatPicker-${DATA_FORMATTERS.DURATION}`,
      }
    );
  }

  return [
    ...additionalOptions,
    {
      value: DATA_FORMATTERS.CUSTOM,
      inputDisplay: i18n.translate('visTypeTimeseries.dataFormatPicker.customLabel', {
        defaultMessage: 'Custom',
      }),
      'data-test-subj': `tsvbDataFormatPicker-${DATA_FORMATTERS.CUSTOM}`,
    },
  ];
};

interface DataFormatPickerProps {
  formatterValue: string;
  changeModelFormatter: (formatter: string) => void;
  shouldIncludeDefaultOption: boolean;
  shouldIncludeNumberOptions: boolean;
}

const htmlId = htmlIdGenerator();

export const DataFormatPicker = ({
  formatterValue,
  changeModelFormatter,
  shouldIncludeDefaultOption,
  shouldIncludeNumberOptions,
}: DataFormatPickerProps) => {
  const options = useMemo(
    () => getDataFormatPickerOptions(shouldIncludeDefaultOption, shouldIncludeNumberOptions),
    [shouldIncludeDefaultOption, shouldIncludeNumberOptions]
  );
  const [selectedFormatter, setSelectedFormatter] = useState(getFormatterType(formatterValue));
  const [customFormatPattern, setCustomFormatPattern] = useState(
    selectedFormatter === DATA_FORMATTERS.CUSTOM ? formatterValue : ''
  );
  const [durationParams, setDurationParams] = useState(
    getDurationParams(selectedFormatter === DATA_FORMATTERS.DURATION ? formatterValue : 'ms,ms,')
  );

  useEffect(() => {
    // formatter value is set to the first option in case options do not include selected formatter
    if (!options.find(({ value }) => value === selectedFormatter)) {
      const [{ value: firstOptionValue }] = options;
      setSelectedFormatter(firstOptionValue);
      changeModelFormatter(firstOptionValue);
    }
  }, [options, selectedFormatter, changeModelFormatter]);

  const handleChange = useCallback(
    (selectedOption: DATA_FORMATTERS) => {
      setSelectedFormatter(selectedOption);
      if (selectedOption === DATA_FORMATTERS.DURATION) {
        const { from, to, decimals } = durationParams;
        changeModelFormatter(`${from},${to},${decimals}`);
      } else if (selectedOption === DATA_FORMATTERS.CUSTOM) {
        changeModelFormatter(customFormatPattern);
      } else {
        changeModelFormatter(selectedOption);
      }
    },
    [changeModelFormatter, customFormatPattern, durationParams]
  );

  const handleCustomFormatStringChange = useCallback(
    (event: ChangeEvent<HTMLInputElement>) => {
      const stringPattern = event.target.value;
      changeModelFormatter(stringPattern);
      setCustomFormatPattern(stringPattern);
    },
    [changeModelFormatter]
  );

  const handleDurationParamsChange = useCallback(
    (paramName: string, paramValue: string) => {
      const newDurationParams = { ...durationParams, [paramName]: paramValue };
      setDurationParams(newDurationParams);
      const { from, to, decimals } = newDurationParams;
      changeModelFormatter(`${from},${to},${decimals}`);
    },
    [changeModelFormatter, durationParams]
  );

  const handleDurationChange = useCallback(
    (optionName: 'from' | 'to') => {
      return ([{ value }]: Array<EuiComboBoxOptionOption<string>>) =>
        handleDurationParamsChange(optionName, value!);
    },
    [handleDurationParamsChange]
  );

  const handleDecimalsChange = useCallback(
    (event: ChangeEvent<HTMLInputElement>) =>
      handleDurationParamsChange('decimals', event.target.value),
    [handleDurationParamsChange]
  );

  let duration;
  if (selectedFormatter === DATA_FORMATTERS.DURATION) {
    const { from, to, decimals = DEFAULT_OUTPUT_PRECISION } = durationParams;
    const selectedFrom = durationInputOptions.find(({ value }) => value === from);
    const selectedTo = durationOutputOptions.find(({ value }) => value === to);

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
              onChange={handleDurationChange('from')}
              singleSelection={{ asPlainText: true }}
              data-test-subj="dataFormatPickerDurationFrom"
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
              onChange={handleDurationChange('to')}
              singleSelection={{ asPlainText: true }}
              data-test-subj="dataFormatPickerDurationTo"
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
                onChange={handleDecimalsChange}
                data-test-subj="dataFormatPickerDurationDecimal"
              />
            </EuiFormRow>
          </EuiFlexItem>
        )}
      </>
    );
  }

  let custom;
  if (selectedFormatter === DATA_FORMATTERS.CUSTOM && shouldIncludeNumberOptions) {
    custom = (
      <EuiFlexItem grow={false}>
        <EuiFormRow
          label={
            <FormattedMessage
              id="visTypeTimeseries.dataFormatPicker.formatPatternLabel"
              defaultMessage="Numeral.js format pattern (Default: {defaultPattern})"
              values={{ defaultPattern: <EuiCode>{DEFAULT_CUSTOM_FORMAT_PATTERN}</EuiCode> }}
            />
          }
          helpText={
            <span>
              <EuiLink target="_blank" href="http://numeraljs.com/#format">
                <FormattedMessage
                  id="visTypeTimeseries.dataFormatPicker.formatPatternHelpText"
                  defaultMessage="Documentation"
                />
              </EuiLink>
            </span>
          }
        >
          <EuiFieldText
            placeholder={DEFAULT_CUSTOM_FORMAT_PATTERN}
            value={customFormatPattern}
            onChange={handleCustomFormatStringChange}
          />
        </EuiFormRow>
      </EuiFlexItem>
    );
  }

  return (
    <>
      <EuiFlexItem>
        <EuiFormRow
          label={i18n.translate('visTypeTimeseries.defaultDataFormatterLabel', {
            defaultMessage: 'Data formatter',
          })}
          fullWidth
        >
          <EuiSuperSelect
            options={options}
            valueOfSelected={selectedFormatter}
            onChange={handleChange}
            data-test-subj="tsvbDataFormatPicker"
            fullWidth
            hasDividers
          />
        </EuiFormRow>
      </EuiFlexItem>
      {selectedFormatter === DATA_FORMATTERS.DURATION && duration}
      {selectedFormatter === DATA_FORMATTERS.CUSTOM && custom}
    </>
  );
};
