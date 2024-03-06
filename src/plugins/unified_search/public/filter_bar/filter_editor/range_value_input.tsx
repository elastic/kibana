/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import moment from 'moment';
import { EuiFormControlLayoutDelimited } from '@elastic/eui';
import { InjectedIntl, injectI18n } from '@kbn/i18n-react';
import { get } from 'lodash';
import React from 'react';
import { KibanaReactContextValue, useKibana } from '@kbn/kibana-react-plugin/public';
import type { DataViewField } from '@kbn/data-views-plugin/common';
import { CoreStart } from '@kbn/core/public';
import { ValueInputType } from './value_input_type';

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

export function isRangeParams(params: any): params is RangeParams {
  return Boolean(params && 'from' in params && 'to' in params);
}

export const formatDateChange = (
  value: string | number | boolean,
  kibana: KibanaReactContextValue<Partial<CoreStart>>
) => {
  if (typeof value !== 'string' && typeof value !== 'number') return value;

  const tzConfig = kibana.services.uiSettings!.get('dateFormat:tz');
  const tz = !tzConfig || tzConfig === 'Browser' ? moment.tz.guess() : tzConfig;
  const momentParsedValue = moment(value).tz(tz);
  if (momentParsedValue.isValid()) return momentParsedValue?.format('YYYY-MM-DDTHH:mm:ss.SSSZ');

  return value;
};

function RangeValueInputUI(props: Props) {
  const kibana = useKibana();

  const onFromChange = (value: string | number | boolean) => {
    if (typeof value !== 'string' && typeof value !== 'number') {
      throw new Error('Range params must be a string or number');
    }
    props.onChange({ from: value === '' ? undefined : value, to: get(props, 'value.to') });
  };

  const onToChange = (value: string | number | boolean) => {
    if (typeof value !== 'string' && typeof value !== 'number') {
      throw new Error('Range params must be a string or number');
    }
    props.onChange({ from: get(props, 'value.from'), to: value === '' ? undefined : value });
  };

  return (
    <div>
      <EuiFormControlLayoutDelimited
        compressed={props.compressed}
        fullWidth={props.fullWidth}
        aria-label={props.intl.formatMessage({
          id: 'unifiedSearch.filter.filterEditor.rangeInputLabel',
          defaultMessage: 'Range',
        })}
        startControl={
          <ValueInputType
            controlOnly
            compressed={props.compressed}
            field={props.field}
            value={props.value ? props.value.from : undefined}
            onChange={onFromChange}
            onBlur={(value) => {
              onFromChange(formatDateChange(value, kibana));
            }}
            placeholder={props.intl.formatMessage({
              id: 'unifiedSearch.filter.filterEditor.rangeStartInputPlaceholder',
              defaultMessage: 'Start',
            })}
            disabled={props.disabled}
            dataTestSubj="range-start"
          />
        }
        endControl={
          <ValueInputType
            controlOnly
            compressed={props.compressed}
            field={props.field}
            value={props.value ? props.value.to : undefined}
            onChange={onToChange}
            onBlur={(value) => {
              onToChange(formatDateChange(value, kibana));
            }}
            placeholder={props.intl.formatMessage({
              id: 'unifiedSearch.filter.filterEditor.rangeEndInputPlaceholder',
              defaultMessage: 'End',
            })}
            disabled={props.disabled}
            dataTestSubj="range-end"
          />
        }
      />
    </div>
  );
}

export const RangeValueInput = injectI18n(RangeValueInputUI);
