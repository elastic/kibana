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

import React, { PureComponent } from 'react';
import PropTypes from 'prop-types';

import {
  EuiBasicTable,
  EuiFormRow,
} from '@elastic/eui';

import './samples.less';

export class FormatEditorSamples extends PureComponent {
  static propTypes = {
    samples: PropTypes.arrayOf(PropTypes.shape({
      input: PropTypes.any.isRequired,
      output: PropTypes.any.isRequired,
    })).isRequired,
  };

  render() {
    const { samples } = this.props;

    const columns = [
      {
        field: 'input',
        name: 'Input',
        render: (input) => {
          return typeof input === 'object' ? JSON.stringify(input) : input;
        },
      },
      {
        field: 'output',
        name: 'Output',
        render: (output) => {
          return (
            <div
              /*
               * Justification for dangerouslySetInnerHTML:
               * Sample output may contain HTML tags, like URL image/audio format.
               */
              dangerouslySetInnerHTML={{ __html: output }} //eslint-disable-line react/no-danger
            />
          );
        },
      }
    ];


    return samples.length ? (
      <EuiFormRow
        label="Samples"
      >
        <EuiBasicTable
          className="fieldFormatEditor__samples"
          compressed={true}
          items={samples}
          columns={columns}
        />
      </EuiFormRow>
    ) : null;
  }
}
