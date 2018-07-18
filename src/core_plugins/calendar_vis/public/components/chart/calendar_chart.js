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
import { CalendarAxis } from './axis/calendar_axis';
import { ChartGrid } from './grid/chart_grid';
import { ChartTitle } from './title/chart_title';

export class CalendarChart extends React.Component {

    state = {
      width: '100%',
      height: '100%'
    };

    constructor(props) {
      super(props);
      this.svg = React.createRef();
    }

    componentDidMount() {
      this._render();
      this.props.renderComplete();
    }

    render() {
      const { visConfig, vislibData } = this.props;

      return (
        <svg
          width={this.state.width}
          height={this.state.height}
          ref={this.svg}
        >
          {visConfig.get('categoryAxes').map((axisArgs, i) => (
            <CalendarAxis
              key={i}
              type={visConfig.get('type')}
              gridConfig={visConfig.get('grid')}
              axisConfig={axisArgs}
              vislibData={vislibData}
            />
          ))}
          <ChartGrid type={visConfig.get('type')} gridConfig={visConfig.get('grid')} vislibData={vislibData} />
          <ChartTitle gridConfig={visConfig.get('grid')} label={vislibData.label} />
        </svg>
      );
    }

    _render() {
      if(this.svg.current) {
        const [xOffset, yOffset] = this.props.visConfig.get(['grid.xOffset', 'grid.yOffset']);
        const svg = this.svg.current;
        this.setState({
          width: svg.getBoundingClientRect().width + xOffset,
          height: svg.getBoundingClientRect().height + yOffset
        });
      }
    }

    componentWillUnmount() {
      this.svg = null;
    }
}
