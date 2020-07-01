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

import { EuiIcon, EuiLink, EuiFormHelpText, EuiFormControlLayoutDelimited } from '@elastic/eui';
import { FormattedMessage, InjectedIntl, injectI18n } from '@kbn/i18n/react';
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
  field?: IFieldType;
  value?: RangeParams;
  onChange: (params: RangeParamsPartial) => void;
  intl: InjectedIntl;
}

function RangeValueInputUI(props: Props) {
  const kibana = useKibana();
  const dataMathDocLink = kibana.services.docLinks!.links.date.dateMath;
  const type = props.field ? props.field.type : 'string';

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
        aria-label={props.intl.formatMessage({
          id: 'data.filter.filterEditor.rangeInputLabel',
          defaultMessage: 'Range',
        })}
        startControl={
          <ValueInputType
            controlOnly
            type={type}
            value={props.value ? props.value.from : undefined}
            onChange={onFromChange}
            placeholder={props.intl.formatMessage({
              id: 'data.filter.filterEditor.rangeStartInputPlaceholder',
              defaultMessage: 'Start of the range',
            })}
          />
        }
        endControl={
          <ValueInputType
            controlOnly
            type={type}
            value={props.value ? props.value.to : undefined}
            onChange={onToChange}
            placeholder={props.intl.formatMessage({
              id: 'data.filter.filterEditor.rangeEndInputPlaceholder',
              defaultMessage: 'End of the range',
            })}
          />
        }
      />
      {type === 'date' ? (
        <EuiFormHelpText>
          <EuiLink target="_blank" href={dataMathDocLink}>
            <FormattedMessage
              id="data.filter.filterEditor.dateFormatHelpLinkLabel"
              defaultMessage="Accepted date formats"
            />{' '}
            <EuiIcon type="popout" size="s" />
          </EuiLink>
        </EuiFormHelpText>
      ) : (
        ''
      )}
    </div>
  );
}

export const RangeValueInput = injectI18n(RangeValueInputUI);
