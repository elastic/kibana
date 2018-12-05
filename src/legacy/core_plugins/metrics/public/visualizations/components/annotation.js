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
import { EuiToolTip } from '@elastic/eui';
class Annotation extends Component {

  constructor(props) {
    super(props);
  }

  renderTooltip() {
    const [ timestamp, messageSource ] = this.props.series;
    const messages = messageSource.map((message, i) => {
      return (
        <div
          key={`${message}-${i}`}
          className="tvbVisAnnotation__message"
        >{ message }
        </div>
      );
    });
    return (
      <div>
        <div className={`tvbVisAnnotation__timestamp`}>{ moment(timestamp).format('lll') }</div>
        { messages }
      </div>
    );
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
      <div className="tvbVisAnnotation" style={style.container}>
        <div className="tvbVisAnnotation__line" style={style.line} />
        <EuiToolTip className="tvbVisAnnotation__tooltip" content={tooltip} position="top">
          <i className={`tvbVisAnnotation__icon fa ${icon}`} style={style.icon} />
        </EuiToolTip>
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
