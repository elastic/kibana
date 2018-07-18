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

import React from 'react';
import { GridConfig } from '../grid/grid_config';
import './chart_title.less';

export class ChartTitle extends React.Component {
  constructor(props) {
    super(props);
    const { gridConfig } = this.props;
    this.gridConfig = new GridConfig(gridConfig);
    this.state = {
      label: props.label
    };
  }

  render() {
    const year = this.state.label.slice(0, 4);
    const [xOffset, yOffset] = this.gridConfig.get(['xOffset', 'yOffset']);

    return (
      <svg id={`title_${year}`} className="calendar-title" width="100%" height={1.25 * yOffset}>
        <text x={xOffset} y={yOffset}>
          {this.state.label}
        </text>
      </svg>
    );
  }

  componentWillUnmount() {
    this.gridConfig = null;
  }
}
