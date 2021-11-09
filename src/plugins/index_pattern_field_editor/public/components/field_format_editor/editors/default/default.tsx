/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { PureComponent, ReactText } from 'react';
import { i18n } from '@kbn/i18n';

import type { FieldFormatsContentType } from 'src/plugins/field_formats/common';
import type { Sample, SampleInput } from '../../types';
import type { FormatEditorProps } from '../types';
import { formatId } from './constants';

export const convertSampleInput = (
  converter: (input: SampleInput) => string,
  inputs: SampleInput[]
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
    error = i18n.translate('indexPatternFieldEditor.defaultErrorMessage', {
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

export interface FormatEditorState {
  sampleInputs: SampleInput[];
  sampleConverterType: FieldFormatsContentType;
  error?: string;
  samples: Sample[];
  sampleInputsByType: SampleInputs;
}

export const defaultState = {
  sampleInputs: [] as SampleInput[],
  sampleConverterType: 'text' as FieldFormatsContentType,
  error: undefined,
  samples: [] as Sample[],
  sampleInputsByType: {},
};

export class DefaultFormatEditor<P = {}, S = {}> extends PureComponent<
  FormatEditorProps<P>,
  FormatEditorState & S
> {
  static formatId = formatId;
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
