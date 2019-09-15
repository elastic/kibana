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

import React, { Component } from 'react';

// @ts-ignore
import { EuiProgress, EuiIcon, EuiToolTip } from '@elastic/eui';

interface Props {
  maxProgressValue: number;
}

export class ConsoleProgressBar extends Component<Props, {}> {
  constructor(props: Props) {
    super(props);

    this.state = {
      val: 0.0,
    };
  }

  private timeoutFunction: any;

  incrementProgress() {
    let progVal = this.state.val;
    if (progVal < this.props.maxProgressValue) {
      progVal += 0.1;
      this.setState({ val: progVal });
      const thisInstance = this;
      this.timeoutFunction = setTimeout(function() {
        thisInstance.incrementProgress();
      }, 100);
    }
  }

  startProgress() {
    const thisInstance = this;
    this.timeoutFunction = setTimeout(function() {
      thisInstance.incrementProgress();
    }, 100);
  }

  resetProgress() {
    this.setState({ val: 0 });
    clearTimeout(this.timeoutFunction);
  }

  render() {
    const runSeconds = Math.round(this.state.val * 100) / 100;
    const toolTipText =
      'Query run time: ' +
      runSeconds +
      ' seconds (timeout: ' +
      this.props.maxProgressValue +
      ' seconds)';
    return (
      <div>
        <EuiToolTip position="top" content={toolTipText}>
          <EuiIcon type="clock" />
        </EuiToolTip>
        <EuiProgress
          value={this.state.val}
          max={this.props.maxProgressValue}
          size="xs"
          color="accent"
          position="absolute"
        />
      </div>
    );
  }
}
