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

import { EuiFormRow } from '@elastic/eui';
import React, { Component } from 'react';
import { ValueInputType } from 'ui/filter_bar/react/filter_editor/value_input_type';
import { IndexPattern, IndexPatternField } from 'ui/index_patterns';

interface Props {
  indexPattern?: IndexPattern;
  field?: IndexPatternField;
  value?: string;
  onChange: (value: string | number | boolean) => void;
}

export class PhraseValueInput extends Component<Props> {
  public render() {
    return (
      <EuiFormRow label="Value">
        <ValueInputType
          placeholder="The value to match against the selected field"
          value={this.props.value}
          onChange={this.props.onChange}
          type={this.props.field ? this.props.field.type : 'string'}
        />
      </EuiFormRow>
    );
  }
}
