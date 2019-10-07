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
import { Component } from 'react';
import React from 'react';
import { getDocLink } from 'ui/documentation_links';
import { Field } from '../../../index_patterns';
import { ValueInputType } from './value_input_type';

interface RangeParams {
  from: number | string;
  to: number | string;
}

type RangeParamsPartial = Partial<RangeParams>;

interface Props {
  field?: Field;
  value?: RangeParams;
  onChange: (params: RangeParamsPartial) => void;
  intl: InjectedIntl;
}

class RangeValueInputUI extends Component<Props> {
  constructor(props: Props) {
    super(props);
  }

  public render() {
    const type = this.props.field ? this.props.field.type : 'string';

    return (
      <div>
        <EuiFormControlLayoutDelimited
          aria-label={this.props.intl.formatMessage({
            id: 'data.filter.filterEditor.rangeInputLabel',
            defaultMessage: 'Range',
          })}
          startControl={
            <ValueInputType
              controlOnly
              type={type}
              value={this.props.value ? this.props.value.from : undefined}
              onChange={this.onFromChange}
              placeholder={this.props.intl.formatMessage({
                id: 'data.filter.filterEditor.rangeStartInputPlaceholder',
                defaultMessage: 'Start of the range',
              })}
            />
          }
          endControl={
            <ValueInputType
              controlOnly
              type={type}
              value={this.props.value ? this.props.value.to : undefined}
              onChange={this.onToChange}
              placeholder={this.props.intl.formatMessage({
                id: 'data.filter.filterEditor.rangeEndInputPlaceholder',
                defaultMessage: 'End of the range',
              })}
            />
          }
        />
        {type === 'date' ? (
          <EuiFormHelpText>
            <EuiLink target="_blank" href={getDocLink('date.dateMath')}>
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

  private onFromChange = (value: string | number | boolean) => {
    if (typeof value !== 'string' && typeof value !== 'number') {
      throw new Error('Range params must be a string or number');
    }
    this.props.onChange({ from: value, to: get(this, 'props.value.to') });
  };

  private onToChange = (value: string | number | boolean) => {
    if (typeof value !== 'string' && typeof value !== 'number') {
      throw new Error('Range params must be a string or number');
    }
    this.props.onChange({ from: get(this, 'props.value.from'), to: value });
  };
}

export const RangeValueInput = injectI18n(RangeValueInputUI);
