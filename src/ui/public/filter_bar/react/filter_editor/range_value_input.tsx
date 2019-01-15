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

import { EuiFlexGroup, EuiFlexItem, EuiFormRow } from '@elastic/eui';
import { InjectedIntl, injectI18n } from '@kbn/i18n/react';
import { get, isEmpty } from 'lodash';
import { Component } from 'react';
import React from 'react';
import { IndexPatternField } from 'ui/index_patterns';
import { validateParams } from './lib/filter_editor_utils';
import { ValueInputType } from './value_input_type';

interface RangeParams {
  from: number | string;
  to: number | string;
}

type RangeParamsPartial = Partial<RangeParams>;

interface Props {
  field?: IndexPatternField;
  value?: RangeParams;
  onChange: (params: RangeParamsPartial, isInvalid: boolean) => void;
  intl: InjectedIntl;
  refCallback: (element: HTMLElement) => void;
}

interface State {
  fromIsInvalid: boolean;
  toIsInvalid: boolean;
}

class RangeValueInputUI extends Component<Props, State> {
  public constructor(props: Props) {
    super(props);
    this.state = {
      fromIsInvalid:
        isEmpty(props.value) ||
        !validateParams(get(props, 'value.from'), get(props, 'field.type', 'string')),
      toIsInvalid:
        isEmpty(props.value) ||
        !validateParams(get(props, 'value.to'), get(props, 'field.type', 'string')),
    };
  }

  public render() {
    const type = this.props.field ? this.props.field.type : 'string';

    return (
      <EuiFlexGroup style={{ maxWidth: 600 }}>
        <EuiFlexItem>
          <EuiFormRow
            label={this.props.intl.formatMessage({
              id: 'common.ui.filterEditor.rangeStartInputLabel',
              defaultMessage: 'From',
            })}
          >
            <ValueInputType
              type={type}
              value={this.props.value ? this.props.value.from : undefined}
              onChange={this.onFromChange}
              placeholder={this.props.intl.formatMessage({
                id: 'common.ui.filterEditor.rangeStartInputPlaceholder',
                defaultMessage: 'Start of the range',
              })}
              refCallback={this.props.refCallback}
            />
          </EuiFormRow>
        </EuiFlexItem>
        <EuiFlexItem>
          <EuiFormRow
            label={this.props.intl.formatMessage({
              id: 'common.ui.filterEditor.rangeEndInputLabel',
              defaultMessage: 'To',
            })}
          >
            <ValueInputType
              type={type}
              value={this.props.value ? this.props.value.to : undefined}
              onChange={this.onToChange}
              placeholder={this.props.intl.formatMessage({
                id: 'common.ui.filterEditor.rangeEndInputPlaceholder',
                defaultMessage: 'End of the range',
              })}
            />
          </EuiFormRow>
        </EuiFlexItem>
      </EuiFlexGroup>
    );
  }

  private onFromChange = (value: string | number | boolean, isInvalid: boolean) => {
    if (typeof value !== 'string' && typeof value !== 'number') {
      throw new Error('Range params must be a string or number');
    }

    this.setState({ fromIsInvalid: isInvalid });
    return this.props.onChange(
      { from: value, to: get(this, 'props.value.to') },
      this.state.toIsInvalid || isInvalid
    );
  };

  private onToChange = (value: string | number | boolean, isInvalid: boolean) => {
    if (typeof value !== 'string' && typeof value !== 'number') {
      throw new Error('Range params must be a string or number');
    }

    this.setState({ toIsInvalid: isInvalid });
    return this.props.onChange(
      { from: get(this, 'props.value.from'), to: value },
      this.state.fromIsInvalid || isInvalid
    );
  };
}

export const RangeValueInput = injectI18n(RangeValueInputUI);
