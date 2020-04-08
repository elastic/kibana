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

import React, { PureComponent, ReactText } from 'react';
import { i18n } from '@kbn/i18n';

import { Sample, ConverterType } from '../../../../types';

export const convertSampleInput = (
  converter: (input: string | number) => string,
  inputs: Array<string | number>
) => {
  let error = null;
  let samples: Sample[] = [];

  try {
    samples = inputs.map(input => {
      return {
        input,
        output: converter(input),
      };
    });
  } catch (e) {
    error = i18n.translate('common.ui.fieldEditor.defaultErrorMessage', {
      defaultMessage: 'An error occurred while trying to use this format configuration: {message}',
      values: { message: e.message },
    });
  }

  return {
    error,
    samples,
  };
};

interface SampleInputs {
  [key: string]: Array<ReactText[] | ReactText>;
}

export interface FormatEditorProps<P> {
  fieldType: string; // todo change to enum
  format: any; // todo DecoratedFieldFormat
  formatParams: { type?: string } & P; // todo
  onChange: (newParams: any) => void; // todo
  onError: (error: any) => void; // todo
}

export interface FormatEditorState {
  sampleInputs: ReactText[];
  sampleConverterType?: ConverterType;
  error: any;
  samples: Sample[];
  sampleInputsByType: SampleInputs;
}

export const defaultState = {
  sampleInputs: [] as ReactText[],
  sampleConverterType: ConverterType.TEXT,
  error: null,
  samples: [] as Sample[],
  sampleInputsByType: {},
};

export class DefaultFormatEditor<P = {}, S = {}> extends PureComponent<
  FormatEditorProps<P>,
  FormatEditorState & S
> {
  state = defaultState as FormatEditorState & S;

  static getDerivedStateFromProps(nextProps: FormatEditorProps<{}>, state: FormatEditorState) {
    const { format, formatParams, onError } = nextProps;
    const { sampleInputsByType, sampleInputs, sampleConverterType } = state;

    const converter = format.getConverterFor(sampleConverterType);
    const type = typeof sampleInputsByType === 'object' && formatParams.type;
    const inputs = type ? sampleInputsByType[formatParams.type as string] || [] : sampleInputs;
    // console.log('inputs', inputs);
    const output = convertSampleInput(converter, inputs);
    // console.log('getDerivedStateFromProps', nextProps, state);
    onError(output.error);
    return output;
  }

  onChange = (newParams = {}) => {
    const { onChange, formatParams } = this.props;
    onChange({
      ...formatParams,
      ...newParams,
    });
  };

  render() {
    return <></>;
  }
}
