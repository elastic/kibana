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
import React, { Component } from 'react';
import PropTypes from 'prop-types';
import tickFormatter from '../../lib/tick_formatter';
import calculateLabel from '../../../../common/calculate_label';
import { isSortable } from './is_sortable';
import { EuiToolTip } from '@elastic/eui';
import replaceVars from '../../lib/replace_vars';

function getColor(rules, colorKey, value) {
  let color;
  if (rules) {
    rules.forEach((rule) => {
      if (rule.operator && rule.value != null) {
        if (_[rule.operator](value, rule.value)) {
          color = rule[colorKey];
        }
      }
    });
  }
  return color;
}

class TableVis extends Component {

  constructor(props) {
    super(props);
    this.renderRow = this.renderRow.bind(this);
  }

  renderRow(row) {
    const { model } = this.props;
    const rowId = row.key;
    let rowDisplay = rowId;
    if (model.drilldown_url) {
      const url = replaceVars(model.drilldown_url, {}, { key: row.key });
      rowDisplay = (<a href={url}>{rowDisplay}</a>);
    }
    const columns = row.series.filter(item => item).map(item => {
      const column = model.series.find(c => c.id === item.id);
      if (!column) return null;
      const formatter = tickFormatter(column.formatter, column.value_template, this.props.getConfig);
      const value = formatter(item.last);
      let trend;
      if (column.trend_arrows) {
        const trendClass = item.slope > 0 ? 'fa-long-arrow-up' : 'fa-long-arrow-down';
        trend = (
          <span className="tsvb-table__trend">
            <i className={`fa ${trendClass}`}/>
          </span>
        );
      }
      const style = { color: getColor(column.color_rules, 'text', item.last) };
      return (
        <td key={`${rowId}-${item.id}`} className="tsvb-table__value" style={style}>
          <span className="tsvb-table__value-display">{ value }</span>
          {trend}
        </td>
      );
    });
    return (
      <tr key={rowId}>
        <td className="tsvb-table__fieldName">{rowDisplay}</td>
        {columns}
      </tr>
    );
  }

  renderHeader() {
    const { model, uiState, onUiState } = this.props;
    const stateKey = `${model.type}.sort`;
    const sort = uiState.get(stateKey, {
      column: '_default_',
      order: 'asc'
    });
    const columns  = model.series.map(item => {
      const metric = _.last(item.metrics);
      const label = item.label || calculateLabel(metric, item.metrics);
      const handleClick = () => {
        if (!isSortable(metric)) return;
        let order;
        if (sort.column === item.id) {
          order = sort.order === 'asc' ? 'desc' : 'asc';
        } else {
          order = 'asc';
        }
        onUiState(stateKey, { column: item.id, order });
      };
      let sortComponent;
      if (isSortable(metric)) {
        let sortIcon;
        if (sort.column === item.id) {
          sortIcon = sort.order === 'asc' ? 'sort-asc' : 'sort-desc';
        } else {
          sortIcon = 'sort';
        }
        sortComponent = (
          <i className={`fa fa-${sortIcon}`} />
        );
      }
      let headerContent = (
        <span>{label} {sortComponent}</span>
      );
      if (!isSortable(metric)) {
        headerContent = (
          <EuiToolTip content="This Column is Not Sortable">{headerContent}</EuiToolTip>
        );
      }

      return (
        <th
          className="tsvb-table__columnName"
          onClick={handleClick}
          key={item.id}
          scope="col"
        >
          {headerContent}
        </th>
      );
    });
    const label = model.pivot_label || model.pivot_field || model.pivot_id;
    let sortIcon;
    if (sort.column === '_default_') {
      sortIcon = sort.order === 'asc' ? 'sort-asc' : 'sort-desc';
    } else {
      sortIcon = 'sort';
    }
    const sortComponent = (
      <i className={`fa fa-${sortIcon}`} />
    );
    const handleSortClick = () => {
      let order;
      if (sort.column === '_default_') {
        order = sort.order === 'asc' ? 'desc' : 'asc';
      } else {
        order = 'asc';
      }
      onUiState(stateKey, { column: '_default_', order });
    };
    return (
      <tr>
        <th scope="col" onClick={handleSortClick}>{label} {sortComponent}</th>
        { columns }
      </tr>
    );
  }

  render() {
    const { visData, model } = this.props;
    const header = this.renderHeader();
    let rows;
    let reversedClass = '';

    if (this.props.reversed) {
      reversedClass = 'reversed';
    }

    if (_.isArray(visData.series) && visData.series.length) {
      rows = visData.series.map(this.renderRow);
    } else {
      let message = 'No results available.';
      if (!model.pivot_id) {
        message += ' You must choose a group by field for this visualization.';
      }
      rows = (
        <tr>
          <td
            className="tsvb-table__noResults"
            colSpan={model.series.length + 1}
          >
            {message}
          </td>
        </tr>
      );
    }
    return(
      <div className={`dashboard__visualization ${reversedClass}`} data-test-subj="tableView">
        <table className="table">
          <thead>
            {header}
          </thead>
          <tbody>
            {rows}
          </tbody>
        </table>
      </div>
    );
  }

}

TableVis.defaultProps = {
  sort: {}
};

TableVis.propTypes = {
  visData: PropTypes.object,
  model: PropTypes.object,
  backgroundColor: PropTypes.string,
  onPaginate: PropTypes.func,
  onUiState: PropTypes.func,
  uiState: PropTypes.object,
  pageNumber: PropTypes.number,
  reversed: PropTypes.bool
};

export default TableVis;
