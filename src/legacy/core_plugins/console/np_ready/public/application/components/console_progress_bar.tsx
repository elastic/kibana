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

/*
import {
  ElasticsearchConfig,
  config,
} from '../../../../../../../core/server/elasticsearch/elasticsearch_config';
*/

// @ts-ignore
interface Props {
  kibanaTimeout: number;
}

export class ConsoleProgressBar extends Component<Props, {}> {
  constructor(props: Props) {
    super(props);

    this.state = {
      val: 0.0,
      lastStatementTime: 0.0,
      queryTimeout: props.kibanaTimeout,
    };
  }

  private timeoutFunction: any;

  incrementProgress() {
    let progVal = this.state.val;
    if (progVal < this.state.queryTimeout) {
      progVal += 0.1;
      this.setState({ val: progVal });
      this.setState({ lastStatementTime: progVal });
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
    this.setState({ lastStatementTime: this.state.val });
    this.setState({ val: 0 });
    clearTimeout(this.timeoutFunction);
  }

  render() {
    const runSeconds = Math.round(this.state.lastStatementTime * 100) / 100;
    const toolTipText = 'Statement run time: ' + runSeconds + 's';
    return (
      <div>
        <EuiProgress
          value={this.state.val}
          max={this.state.queryTimeout}
          size="xs"
          color="accent"
          position="absolute"
        />
        <div style={{ float: 'right', marginTop: '-30px' }}>{toolTipText}</div>
      </div>
    );
  }
}
