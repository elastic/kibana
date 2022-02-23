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
import { useKibana } from '../../../../../kibana_react/public';
import { IFieldType } from '../../..';
import { ValueInputType } from './value_input_type';

interface RangeParams {
  from: number | string;
  to: number | string;
}

type RangeParamsPartial = Partial<RangeParams>;

interface Props {
  field: IFieldType;
  value?: RangeParams;
  onChange: (params: RangeParamsPartial) => void;
  intl: InjectedIntl;
  fullWidth?: boolean;
}

function RangeValueInputUI(props: Props) {
  const kibana = useKibana();
  const tzConfig = kibana.services.uiSettings!.get('dateFormat:tz');

  const formatDateChange = (value: string | number | boolean) => {
    if (typeof value !== 'string' && typeof value !== 'number') return value;

    const momentParsedValue = moment(value).tz(tzConfig);
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

  return (
    <div>
      <EuiFormControlLayoutDelimited
        fullWidth={props.fullWidth}
        aria-label={props.intl.formatMessage({
          id: 'data.filter.filterEditor.rangeInputLabel',
          defaultMessage: 'Range',
        })}
        startControl={
          <ValueInputType
            controlOnly
            field={props.field}
            value={props.value ? props.value.from : undefined}
            onChange={onFromChange}
            onBlur={(value) => {
              onFromChange(formatDateChange(value));
            }}
            placeholder={props.intl.formatMessage({
              id: 'data.filter.filterEditor.rangeStartInputPlaceholder',
              defaultMessage: 'Start of the range',
            })}
          />
        }
        endControl={
          <ValueInputType
            controlOnly
            field={props.field}
            value={props.value ? props.value.to : undefined}
            onChange={onToChange}
            onBlur={(value) => {
              onToChange(formatDateChange(value));
            }}
            placeholder={props.intl.formatMessage({
              id: 'data.filter.filterEditor.rangeEndInputPlaceholder',
              defaultMessage: 'End of the range',
            })}
          />
        }
      />
    </div>
  );
}

export const RangeValueInput = injectI18n(RangeValueInputUI);
