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

import { EuiFlexGroup, EuiFlexItem, EuiFormRow, EuiIcon, EuiLink } from '@elastic/eui';
import { FormattedMessage, InjectedIntl, injectI18n } from '@kbn/i18n/react';
import { get } from 'lodash';
import { Component } from 'react';
import React from 'react';
import { getDocLink } from 'ui/documentation_links';
import { Field } from 'ui/index_patterns';
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
  public constructor(props: Props) {
    super(props);
  }

  public render() {
    const type = this.props.field ? this.props.field.type : 'string';

    return (
      <div>
        <EuiFlexGroup style={{ maxWidth: 600 }}>
          <EuiFlexItem>
            <EuiFormRow
              label={this.props.intl.formatMessage({
                id: 'data.filter.filterEditor.rangeStartInputLabel',
                defaultMessage: 'From',
              })}
            >
              <ValueInputType
                type={type}
                value={this.props.value ? this.props.value.from : undefined}
                onChange={this.onFromChange}
                placeholder={this.props.intl.formatMessage({
                  id: 'data.filter.filterEditor.rangeStartInputPlaceholder',
                  defaultMessage: 'Start of the range',
                })}
              />
            </EuiFormRow>
          </EuiFlexItem>
          <EuiFlexItem>
            <EuiFormRow
              label={this.props.intl.formatMessage({
                id: 'data.filter.filterEditor.rangeEndInputLabel',
                defaultMessage: 'To',
              })}
            >
              <ValueInputType
                type={type}
                value={this.props.value ? this.props.value.to : undefined}
                onChange={this.onToChange}
                placeholder={this.props.intl.formatMessage({
                  id: 'data.filter.filterEditor.rangeEndInputPlaceholder',
                  defaultMessage: 'End of the range',
                })}
              />
            </EuiFormRow>
          </EuiFlexItem>
        </EuiFlexGroup>
        {type === 'date' ? (
          <EuiLink target="_blank" href={getDocLink('date.dateMath')}>
            <FormattedMessage
              id="data.filter.filterEditor.dateFormatHelpLinkLabel"
              defaultMessage="Accepted date formats"
            />{' '}
            <EuiIcon type="link" />
          </EuiLink>
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
