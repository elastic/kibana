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

import PropTypes from 'prop-types';
import React, { Component } from 'react';
import moment from 'moment';
import reactcss from 'reactcss';
class Annotation extends Component {

  constructor(props) {
    super(props);
    this.state = {
      showTooltip: false
    };
    this.handleMouseOut = this.handleMouseOut.bind(this);
    this.handleMouseOver = this.handleMouseOver.bind(this);
  }

  renderTooltip() {
    if (!this.state.showTooltip) return null;
    const [ timestamp, messageSource ] = this.props.series;
    const reversed = this.props.reversed ? '-reversed' : '';
    const messages = messageSource.map((message, i) => {
      return (
        <div
          key={`${message}-${i}`}
          className="annotation__message"
        >{ message }
        </div>
      );
    });
    return (
      <div className="annotation__tooltip">
        <div className={`annotation__tooltip-body${reversed}`}>
          <div className={`annotation__timestamp${reversed}`}>{ moment(timestamp).format('lll') }</div>
          { messages }
        </div>
        <div className={`annotation__caret${reversed}`} />
      </div>
    );
  }

  handleMouseOver() {
    this.setState({ showTooltip: true });
  }

  handleMouseOut() {
    this.setState({ showTooltip: false });
  }

  render() {
    const { color, plot, icon, series } = this.props;
    const offset = plot.pointOffset({ x: series[0], y: 0 });
    const tooltip = this.renderTooltip();
    const style = reactcss({
      default: {
        container: {
          left: offset.left - 6,
          bottom: 0,
          top: 5
        },
        line: {
          backgroundColor: color
        },
        icon: { color }
      }
    });
    return(
      <div className="annotation" style={style.container}>
        <div className="annotation__line" style={style.line} />
        <div
          onFocus={this.handleMouseOver}
          onBlur={this.handleMouseOut}
          onMouseOver={this.handleMouseOver}
          onMouseOut={this.handleMouseOut}
          className="annotation__icon"
        >
          <i className={`fa ${icon}`} style={style.icon} />
          { tooltip }
        </div>
      </div>
    );
  }

}

Annotation.propTypes = {
  series: PropTypes.array,
  icon: PropTypes.string,
  color: PropTypes.string,
  plot: PropTypes.object,
  reversed: PropTypes.bool
};

export default Annotation;
