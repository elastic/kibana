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

import { FieldFormat, FieldFormatsContentType } from 'src/plugins/data/public';
import { Sample } from '../../../../types';
import { FieldFormatEditorProps } from '../../field_format_editor';

export type ConverterParams = string | number | Array<string | number>;

export const convertSampleInput = (
  converter: (input: ConverterParams) => string,
  inputs: ConverterParams[]
) => {
  let error;
  let samples: Sample[] = [];

  try {
    samples = inputs.map((input) => {
      return {
        input,
        output: converter(input),
      };
    });
  } catch (e) {
    error = i18n.translate('indexPatternManagement.defaultErrorMessage', {
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
  fieldType: string;
  format: FieldFormat;
  formatParams: { type?: string } & P;
  onChange: (newParams: Record<string, any>) => void;
  onError: FieldFormatEditorProps['onError'];
}

export interface FormatEditorState {
  sampleInputs: ReactText[];
  sampleConverterType: FieldFormatsContentType;
  error?: string;
  samples: Sample[];
  sampleInputsByType: SampleInputs;
}

export const defaultState = {
  sampleInputs: [] as ReactText[],
  sampleConverterType: 'text' as FieldFormatsContentType,
  error: undefined,
  samples: [] as Sample[],
  sampleInputsByType: {},
};

export class DefaultFormatEditor<P = {}, S = {}> extends PureComponent<
  FormatEditorProps<P>,
  FormatEditorState & S
> {
  static formatId = 'default';
  state = defaultState as FormatEditorState & S;

  static getDerivedStateFromProps(nextProps: FormatEditorProps<{}>, state: FormatEditorState) {
    const { format, formatParams, onError } = nextProps;
    const { sampleInputsByType, sampleInputs, sampleConverterType } = state;

    const converter = format.getConverterFor(sampleConverterType);
    const type = typeof sampleInputsByType === 'object' && formatParams.type;
    const inputs = type ? sampleInputsByType[formatParams.type as string] || [] : sampleInputs;
    const output = convertSampleInput(converter, inputs);
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
