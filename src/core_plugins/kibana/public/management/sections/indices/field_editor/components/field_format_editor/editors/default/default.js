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

import { PureComponent } from 'react';
import PropTypes from 'prop-types';

import {
  convertSampleInput
} from '../../../../lib';

export class DefaultFormatEditor extends PureComponent {
  static propTypes = {
    fieldType: PropTypes.string.isRequired,
    format: PropTypes.object.isRequired,
    formatParams: PropTypes.object.isRequired,
    onChange: PropTypes.func.isRequired,
    onError: PropTypes.func.isRequired,
  };

  constructor(props) {
    super(props);
    this.state = {
      sampleInputs: [],
      sampleConverterType: 'text',
      error: null,
      samples: [],
    };
  }

  static getDerivedStateFromProps(nextProps, state) {
    const converter = nextProps.format.getConverterFor(state.sampleConverterType);
    const type = typeof state.sampleInputsByType === 'object' && nextProps.formatParams.type;
    const inputs = type ? state.sampleInputsByType[nextProps.formatParams.type] || [] : state.sampleInputs;
    const output = convertSampleInput(converter, inputs);
    nextProps.onError(output.error);
    return output;
  }

  onChange = (newParams = {}) => {
    const { onChange, formatParams } = this.props;
    onChange({
      ...formatParams,
      ...newParams
    });
  };
}
