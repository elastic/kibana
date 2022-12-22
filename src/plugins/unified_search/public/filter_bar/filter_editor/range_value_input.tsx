/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import moment, { Moment } from 'moment';
import { EuiDatePicker, EuiDatePickerRange, EuiFormControlLayoutDelimited } from '@elastic/eui';
import { InjectedIntl, injectI18n } from '@kbn/i18n-react';
import { get } from 'lodash';
import React from 'react';
import { useKibana } from '@kbn/kibana-react-plugin/public';
import type { DataViewField } from '@kbn/data-views-plugin/common';
import { ValueInputType } from './value_input_type';
import { compressedDatepickerStyle } from './value_input_type.styles';

interface RangeParams {
  from: number | string;
  to: number | string;
}

type RangeParamsPartial = Partial<RangeParams>;

interface Props {
  field: DataViewField;
  value?: RangeParams;
  onChange: (params: RangeParamsPartial) => void;
  intl: InjectedIntl;
  fullWidth?: boolean;
  compressed?: boolean;
  disabled?: boolean;
}

const strings = {
  getRangeInputLabel: (intl: InjectedIntl) =>
    intl.formatMessage({
      id: 'unifiedSearch.filter.filterEditor.rangeInputLabel',
      defaultMessage: 'Range',
    }),
  getRangeStartInputPlaceholder: (intl: InjectedIntl) =>
    intl.formatMessage({
      id: 'unifiedSearch.filter.filterEditor.rangeStartInputPlaceholder',
      defaultMessage: 'Start',
    }),
  getRangeEndInputPlaceholder: (intl: InjectedIntl) =>
    intl.formatMessage({
      id: 'unifiedSearch.filter.filterEditor.rangeEndInputPlaceholder',
      defaultMessage: 'End',
    }),
};

export function isRangeParams(params: any): params is RangeParams {
  return Boolean(params && 'from' in params && 'to' in params);
}

function RangeValueInputUI(props: Props) {
  const kibana = useKibana();

  const formatDateChange = (value: string | number | boolean) => {
    if (typeof value !== 'string' && typeof value !== 'number') return value;

    const tzConfig = kibana.services.uiSettings!.get('dateFormat:tz');
    const tz = !tzConfig || tzConfig === 'Browser' ? moment.tz.guess() : tzConfig;
    const momentParsedValue = moment(value).tz(tz);
    if (momentParsedValue.isValid()) return momentParsedValue?.format('YYYY-MM-DDTHH:mm:ss.SSSZ');

    return value;
  };

  const onFromChange = (value: string | number | boolean) => {
    if (typeof value !== 'string' && typeof value !== 'number') {
      throw new Error('Range params must be a string or number');
    }
    props.onChange({ from: value, to: get(props, 'value.to') });
  };

  const onToChange = (value: string | number | boolean) => {
    if (typeof value !== 'string' && typeof value !== 'number') {
      throw new Error('Range params must be a string or number');
    }
    props.onChange({ from: get(props, 'value.from'), to: value });
  };

  const onDatePickerFromChange = (date: Moment) => {
    props.onChange({ from: date.utc().format(), to: get(props, 'value.to') });
  };

  const onDatePickerToChange = (date: Moment) => {
    props.onChange({ from: get(props, 'value.from'), to: date.utc().format() });
  };

  const { field, value, intl, fullWidth, disabled, compressed } = props;

  const type = field?.type ?? 'string';
  const isInvalid = value && value.from > value.to;

  if (['date', 'date_range'].includes(type)) {
    return (
      <div>
        <EuiDatePickerRange
          fullWidth={fullWidth}
          aria-label={strings.getRangeInputLabel(intl)}
          startDateControl={
            <EuiDatePicker
              className={compressed ? compressedDatepickerStyle : undefined}
              selected={value && value.from ? moment(value.from) : undefined}
              onChange={onDatePickerFromChange}
              placeholder={strings.getRangeStartInputPlaceholder(intl)}
              disabled={disabled}
              fullWidth={fullWidth}
              showTimeSelect
              isInvalid={isInvalid}
            />
          }
          endDateControl={
            <EuiDatePicker
              className={compressed ? compressedDatepickerStyle : undefined}
              selected={value && value.to ? moment(value.to) : undefined}
              onChange={onDatePickerToChange}
              placeholder={strings.getRangeEndInputPlaceholder(intl)}
              disabled={disabled}
              fullWidth={fullWidth}
              showTimeSelect
              isInvalid={isInvalid}
            />
          }
        />
      </div>
    );
  }

  return (
    <div>
      <EuiFormControlLayoutDelimited
        compressed={compressed}
        fullWidth={fullWidth}
        aria-label={strings.getRangeInputLabel(intl)}
        startControl={
          <ValueInputType
            controlOnly
            compressed={compressed}
            field={field}
            value={value ? value.from : undefined}
            onChange={onFromChange}
            onBlur={(v) => {
              onFromChange(formatDateChange(v));
            }}
            placeholder={strings.getRangeStartInputPlaceholder(intl)}
            disabled={disabled}
            dataTestSubj="range-start"
          />
        }
        endControl={
          <ValueInputType
            controlOnly
            compressed={compressed}
            field={field}
            value={value ? value.to : undefined}
            onChange={onToChange}
            onBlur={(v) => {
              onToChange(formatDateChange(v));
            }}
            placeholder={strings.getRangeEndInputPlaceholder(intl)}
            disabled={disabled}
            dataTestSubj="range-end"
          />
        }
      />
    </div>
  );
}

export const RangeValueInput = injectI18n(RangeValueInputUI);
