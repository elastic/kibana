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
import React from 'react';
import createLegendSeries from '../lib/create_legend_series';
import reactcss from 'reactcss';
import { htmlIdGenerator } from '@elastic/eui';

function HorizontalLegend(props) {
  const rows = props.series.map(createLegendSeries(props));
  const htmlId = htmlIdGenerator();
  const styles = reactcss({
    hideLegned: {
      legend: {
        display: 'none'
      }
    }
  }, { hideLegned: !props.showLegend });
  let legendControlClass = 'fa fa-chevron-down';
  if (!props.showLegend) {
    legendControlClass = 'fa fa-chevron-up';
  }
  return (
    <div className="rhythm_chart__legend-horizontal">
      <div className="rhythm_chart__legend-control">
        <button
          className={legendControlClass}
          onClick={props.onClick}
          aria-label="Toggle chart legend"
          aria-expanded={!!props.showLegend}
          aria-controls={htmlId('legend')}
        />
      </div>
      <div className="rhythm_chart__legend-series" style={styles.legend} id={htmlId('legend')}>
        { rows }
      </div>
    </div>
  );
}

HorizontalLegend.propTypes = {
  legendPosition: PropTypes.string,
  onClick: PropTypes.func,
  onToggle: PropTypes.func,
  series: PropTypes.array,
  showLegend: PropTypes.bool,
  seriesValues: PropTypes.object,
  seriesFilter: PropTypes.array,
  tickFormatter: PropTypes.func
};

export default HorizontalLegend;
