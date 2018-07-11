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

import _ from 'lodash';
import React from 'react';
import { Legend } from './legend';
import { legendPosition } from './index';

export class LegendBar extends React.Component {

  constructor(props) {
    super(props);
    const legendOpen = this.props.getUiState('vis.legendOpen');
    this.legend = React.createRef();
    this.state = {
      open: legendOpen,
      enableHover: this.props.visConfig.get('enableHover'),
      collapseClass: this._getToggleLegendClasses(legendOpen),
      labels: [{
        label: 'loading ...'
      }]
    };
  }

  _accommodateContainer() {
    let container;
    if(this.legend.current) {
      container = this.legend.current.parentNode.parentNode;
      const legendPos = this.props.position;
      for (const className of container.classList) {
        if (Object.values(legendPosition).includes(className)) {
          container.classList.remove(className);
          break;
        }
      }
      container.classList.add(legendPos);
    }
  }

  toggleLegend() {
    const toggleState = !this.props.getUiState('vis.legendOpen');
    this.setState({
      open: toggleState,
      collapseClass: this._getToggleLegendClasses(toggleState)
    });
    this.props.setUiState('vis.legendOpen', toggleState);
  }

  highlight(ev) {
    if(this.state.enableHover) {
      const item = ev.currentTarget;
      const { dispatch } = this.props;
      dispatch.highlight.call(item, dispatch.handler.el);
    }
  }

  unHighlight(ev) {
    if(this.state.enableHover) {
      const item = ev.currentTarget;
      const { dispatch } = this.props;
      dispatch.unHighlight.call(item, dispatch.handler.el);
    }
  }

  _getToggleLegendClasses(open) {
    const { visConfig } = this.props;
    switch (visConfig.get('legendPosition')) {
      case 'top':
        return open ? 'fa-chevron-circle-up' : 'fa-chevron-circle-down';
      case 'bottom':
        return open ? 'fa-chevron-circle-down' : 'fa-chevron-circle-up';
      case 'left':
        return open ? 'fa-chevron-circle-left' : 'fa-chevron-circle-right';
      case 'right':
        return open ? 'fa-chevron-circle-right' : 'fa-chevron-circle-left';
    }
  }


  static getDerivedStateFromProps(props) {
    const { visConfig, getUiState } = props;
    const labels = visConfig.get('legend.labels', null);
    const legendOpen = getUiState('vis.legendOpen');
    if (!labels) {
      return {
        labels: [{
          label: 'loading ...'
        }]
      };
    }else {
      return {
        open: legendOpen,
        enableHover: visConfig.get('enableHover'),
        labels: _.map(labels, label => ({ label: label }))
      };
    }
  }

  componentDidMount() {
    this._accommodateContainer();
    this.props.renderComplete();
  }

  componentDidUpdate() {
    this._accommodateContainer();
    this.props.renderComplete();
  }

  render() {
    return (
      <div ref={this.legend} className="legend-col-wrapper">
        <button
          type="button"
          onClick={this.toggleLegend.bind(this)}
          className="kuiCollapseButton legend-collapse-button"
          aria-label="Toggle legend"
          aria-expanded={this.state.open}
        >
          <span className={`kuiIcon ${this.state.collapseClass}`} />
        </button>
        {this.state.open &&
          <ul className="legend-ul">
            {this.state.labels.map((legendData, i) => (
              <li
                className="legend-value color"
                key={i}
                onMouseEnter={this.highlight.bind(this)}
                onMouseLeave={this.unHighlight.bind(this)}
                data-label={legendData.label}
              >
                <Legend
                  legendData={legendData}
                  colorFunc={this.props.colorFunc}
                />
              </li>
            ))}
          </ul>
        }
      </div>
    );
  }

  componentWillUnmount() {
    this.legend = null;
  }
}
