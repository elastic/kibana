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

import React, { Fragment } from 'react';
import { DurationFormat } from 'src/plugins/data/common';

import { EuiFieldNumber, EuiFormRow, EuiSelect } from '@elastic/eui';

import { FormattedMessage } from '@kbn/i18n/react';
import { i18n } from '@kbn/i18n';
import {
  DefaultFormatEditor,
  defaultState,
  FormatEditorProps,
  FormatEditorState,
} from '../default';

import { FormatEditorSamples } from '../../samples';

interface DurationFormatEditorState {
  hasDecimalError: boolean;
}

interface InputFormat {
  kind: string;
  text: string;
}

interface OutputFormat {
  method: string;
  text: string;
}

interface DurationFormatEditorFormatParams {
  outputPrecision: number;
  inputFormat: string;
  outputFormat: string;
}

export class DurationFormatEditor extends DefaultFormatEditor<
  DurationFormatEditorFormatParams,
  DurationFormatEditorState
> {
  static formatId = 'duration';
  state = {
    ...defaultState,
    sampleInputs: [-123, 1, 12, 123, 658, 1988, 3857, 123292, 923528271],
    hasDecimalError: false,
  };

  static getDerivedStateFromProps(
    nextProps: FormatEditorProps<DurationFormatEditorFormatParams>,
    state: FormatEditorState & DurationFormatEditorState
  ) {
    const output = super.getDerivedStateFromProps(nextProps, state);
    let error = null;

    if (
      !(nextProps.format as DurationFormat).isHuman() &&
      nextProps.formatParams.outputPrecision > 20
    ) {
      error = i18n.translate('indexPatternManagement.durationErrorMessage', {
        defaultMessage: 'Decimal places must be between 0 and 20',
      });
      nextProps.onError(error);
      return {
        ...output,
        error,
        hasDecimalError: true,
      };
    }

    return {
      ...output,
      hasDecimalError: false,
    };
  }

  render() {
    const { format, formatParams } = this.props;
    const { error, samples, hasDecimalError } = this.state;

    return (
      <Fragment>
        <EuiFormRow
          label={
            <FormattedMessage
              id="indexPatternManagement.duration.inputFormatLabel"
              defaultMessage="Input format"
            />
          }
          isInvalid={!!error}
          error={hasDecimalError ? null : error}
        >
          <EuiSelect
            value={formatParams.inputFormat}
            options={format.type.inputFormats.map((fmt: InputFormat) => {
              return {
                value: fmt.kind,
                text: fmt.text,
              };
            })}
            onChange={(e) => {
              this.onChange({ inputFormat: e.target.value });
            }}
            isInvalid={!!error}
          />
        </EuiFormRow>
        <EuiFormRow
          label={
            <FormattedMessage
              id="indexPatternManagement.duration.outputFormatLabel"
              defaultMessage="Output format"
            />
          }
          isInvalid={!!error}
        >
          <EuiSelect
            value={formatParams.outputFormat}
            options={format.type.outputFormats.map((fmt: OutputFormat) => {
              return {
                value: fmt.method,
                text: fmt.text,
              };
            })}
            onChange={(e) => {
              this.onChange({ outputFormat: e.target.value });
            }}
            isInvalid={!!error}
          />
        </EuiFormRow>
        {!(format as DurationFormat).isHuman() ? (
          <EuiFormRow
            label={
              <FormattedMessage
                id="indexPatternManagement.duration.decimalPlacesLabel"
                defaultMessage="Decimal places"
              />
            }
            isInvalid={!!error}
            error={hasDecimalError ? error : null}
          >
            <EuiFieldNumber
              value={formatParams.outputPrecision}
              min={0}
              max={20}
              onChange={(e) => {
                this.onChange({ outputPrecision: e.target.value ? Number(e.target.value) : null });
              }}
              isInvalid={!!error}
            />
          </EuiFormRow>
        ) : null}
        <FormatEditorSamples samples={samples} />
      </Fragment>
    );
  }
}
