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
import { DefaultNumberFormatEditor } from '../default_number';
import { FormatEditorSamples } from '../../samples';

export class PercentFormatEditor extends DefaultNumberFormatEditor {
  static formatId = 'percent';

  constructor(props) {
    super(props);

    this.state = {
      ...this.state,
      sampleInputs: [0.1, 0.99999, 1, 100, 1000],
    };
  }

  render() {
    const { samples } = this.state;

    return (
      <Fragment>
        {this.renderLocaleOverride()}

        <FormatEditorSamples samples={samples} />
      </Fragment>
    );
  }
}
