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

import formatNumber from '../lib/format_number';
import React, { Component } from 'react';
import { Metric as MetricPropType } from '../lib/prop_types';
import PropTypes from 'prop-types';
import { EuiFlexGrid, EuiFlexItem, EuiCard } from '@elastic/eui';

/*
Displays a metric with the correct format.
*/
export class MetricTile extends Component {
  static propTypes = {
    metric: MetricPropType.isRequired,
  };

  formattedMetric() {
    const { value, type } = this.props.metric;

    const metrics = [].concat(value);
    return metrics
      .map(function(metric) {
        return formatNumber(metric, type);
      })
      .join(', ');
  }

  render() {
    const { name } = this.props.metric;

    return <EuiCard layout="horizontal" title={this.formattedMetric()} description={name} />;
  }
}

/*
Wrapper component that simply maps each metric to MetricTile inside a FlexGroup
*/
const MetricTiles = ({ metrics }) => (
  <EuiFlexGrid columns={3}>
    {metrics.map(metric => (
      <EuiFlexItem key={metric.name}>
        <MetricTile metric={metric} />
      </EuiFlexItem>
    ))}
  </EuiFlexGrid>
);

MetricTiles.propTypes = {
  metrics: PropTypes.arrayOf(MetricPropType).isRequired,
};

export default MetricTiles;
