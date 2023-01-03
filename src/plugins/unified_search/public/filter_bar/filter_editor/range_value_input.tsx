/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { useCallback } from 'react';
import moment, { Moment } from 'moment';
import { i18n } from '@kbn/i18n';
import { EuiDatePicker, EuiDatePickerRange, EuiFormControlLayoutDelimited } from '@elastic/eui';
import { InjectedIntl, injectI18n } from '@kbn/i18n-react';
import type { DataViewField } from '@kbn/data-views-plugin/common';
import { ValueInputType } from './value_input_type';
import { compressedDatepickerStyle } from './datepicker.styles';

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
  const { onChange, value } = props;

  const onFromChange = useCallback(
    (v: string | number | boolean | undefined) => {
      if (v !== undefined && typeof v !== 'string' && typeof v !== 'number') {
        throw new Error('Range params must be a string, number or undefined');
      }
      onChange({ from: v || undefined, to: value?.to });
    },
    [onChange, value]
  );

  const onToChange = useCallback(
    (v: string | number | boolean | undefined) => {
      if (v !== undefined && typeof v !== 'string' && typeof v !== 'number') {
        throw new Error('Range params must be a string, number or undefined');
      }
      onChange({ from: value?.from, to: v || undefined });
    },
    [onChange, value]
  );

  const onDatePickerFromChange = useCallback(
    (date: Moment | null) => {
      onChange({ from: date ? date.utc().format() : undefined, to: value?.to });
    },
    [onChange, value]
  );

  const onDatePickerToChange = useCallback(
    (date: Moment | null) => {
      onChange({ from: value?.from, to: date ? date.utc().format() : undefined });
    },
    [onChange, value]
  );

  const { field, intl, fullWidth, disabled, compressed } = props;

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
              selected={value?.from ? moment(value.from) : null}
              onChange={onDatePickerFromChange}
              placeholder={strings.getRangeStartInputPlaceholder(intl)}
              disabled={disabled}
              fullWidth={fullWidth}
              showTimeSelect
              isInvalid={isInvalid}
              locale={i18n.getLocale()}
              dateFormat="MMM D, YYYY @ HH:mm:ss.SSS"
            />
          }
          endDateControl={
            <EuiDatePicker
              className={compressed ? compressedDatepickerStyle : undefined}
              selected={value && value.to ? moment(value.to) : null}
              onChange={onDatePickerToChange}
              placeholder={strings.getRangeEndInputPlaceholder(intl)}
              disabled={disabled}
              fullWidth={fullWidth}
              showTimeSelect
              isInvalid={isInvalid}
              locale={i18n.getLocale()}
              dateFormat="MMM D, YYYY @ HH:mm:ss.SSS"
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
            onBlur={onFromChange}
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
            onBlur={onToChange}
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
