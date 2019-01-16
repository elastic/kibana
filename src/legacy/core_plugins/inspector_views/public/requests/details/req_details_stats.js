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
import PropTypes from 'prop-types';
import {
  EuiIcon,
  EuiIconTip,
  EuiTable,
  EuiTableBody,
  EuiTableRow,
  EuiTableRowCell,
} from '@elastic/eui';

class RequestDetailsStats extends Component {

  static shouldShow = (request) => !!request.stats && Object.keys(request.stats).length;

  renderStatRow = (stat) => {
    return [
      <EuiTableRow
        key={stat.name}
      >
        <EuiTableRowCell>
          <span className="insRequestDetailsStats__icon">
            { stat.description &&
              <EuiIconTip
                aria-label="Description"
                type="questionInCircle"
                color="subdued"
                content={stat.description}
              />
            }
            { !stat.description &&
              <EuiIcon
                type="empty"
              />
            }
          </span>
          {stat.name}
        </EuiTableRowCell>
        <EuiTableRowCell>{stat.value}</EuiTableRowCell>
      </EuiTableRow>
    ];
  };

  render() {
    const { stats } = this.props.request;
    const sortedStats = Object.keys(stats).sort().map(name => ({ name, ...stats[name] }));
    // TODO: Replace by property once available
    return (
      <EuiTable
        responsive={false}
      >
        <EuiTableBody>
          { sortedStats.map(this.renderStatRow) }
        </EuiTableBody>
      </EuiTable>
    );
  }
}

RequestDetailsStats.propTypes = {
  request: PropTypes.object.isRequired,
};

export { RequestDetailsStats };
