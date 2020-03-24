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

import _, { isArray, last, get } from 'lodash';
import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { createTickFormatter } from '../../lib/tick_formatter';
import { calculateLabel } from '../../../../../../../plugins/vis_type_timeseries/common/calculate_label';
import { isSortable } from './is_sortable';
import { EuiToolTip, EuiIcon } from '@elastic/eui';
import { replaceVars } from '../../lib/replace_vars';
import { fieldFormats } from '../../../../../../../plugins/data/public';
import { FormattedMessage } from '@kbn/i18n/react';
import { getFieldFormats } from '../../../services';

import { METRIC_TYPES } from '../../../../../../../plugins/vis_type_timeseries/common/metric_types';

function getColor(rules, colorKey, value) {
  let color;
  if (rules) {
    rules.forEach(rule => {
      if (rule.operator && rule.value != null) {
        if (_[rule.operator](value, rule.value)) {
          color = rule[colorKey];
        }
      }
    });
  }
  return color;
}

export class TableVis extends Component {
  constructor(props) {
    super(props);

    const fieldFormatsService = getFieldFormats();
    const DateFormat = fieldFormatsService.getType(fieldFormats.FIELD_FORMAT_IDS.DATE);

    this.dateFormatter = new DateFormat({}, this.props.getConfig);
  }

  get visibleSeries() {
    return get(this.props, 'model.series', []).filter(series => !series.hidden);
  }

  renderRow = row => {
    const { model } = this.props;
    let rowDisplay = model.pivot_type === 'date' ? this.dateFormatter.convert(row.key) : row.key;
    if (model.drilldown_url) {
      const url = replaceVars(model.drilldown_url, {}, { key: row.key });
      rowDisplay = <a href={url}>{rowDisplay}</a>;
    }
    const columns = row.series
      .filter(item => item)
      .map(item => {
        const column = this.visibleSeries.find(c => c.id === item.id);
        if (!column) return null;
        const formatter = createTickFormatter(
          column.formatter,
          column.value_template,
          this.props.getConfig
        );
        const value = formatter(item.last);
        let trend;
        if (column.trend_arrows) {
          const trendIcon = item.slope > 0 ? 'sortUp' : 'sortDown';
          trend = (
            <span>
              &nbsp; <EuiIcon type={trendIcon} color="subdued" />
            </span>
          );
        }
        const style = { color: getColor(column.color_rules, 'text', item.last) };
        return (
          <td
            key={`${row.key}-${item.id}`}
            data-test-subj="tvbTableVis__value"
            className="eui-textRight"
            style={style}
          >
            <span>{value}</span>
            {trend}
          </td>
        );
      });
    return (
      <tr key={row.key}>
        <td>{rowDisplay}</td>
        {columns}
      </tr>
    );
  };

  renderHeader() {
    const { model, uiState, onUiState } = this.props;
    const stateKey = `${model.type}.sort`;
    const sort = uiState.get(stateKey, {
      column: '_default_',
      order: 'asc',
    });

    const calculateHeaderLabel = (metric, item) => {
      const defaultLabel = item.label || calculateLabel(metric, item.metrics);

      switch (metric.type) {
        case METRIC_TYPES.PERCENTILE:
          return `${defaultLabel} (${last(metric.percentiles).value || 0})`;
        case METRIC_TYPES.PERCENTILE_RANK:
          return `${defaultLabel} (${last(metric.values) || 0})`;
        default:
          return defaultLabel;
      }
    };

    const columns = this.visibleSeries.map(item => {
      const metric = last(item.metrics);
      const label = calculateHeaderLabel(metric, item);

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
          sortIcon = sort.order === 'asc' ? 'sortUp' : 'sortDown';
        } else {
          sortIcon = 'empty';
        }
        sortComponent = <EuiIcon type={sortIcon} />;
      }
      let headerContent = (
        <span>
          {label} {sortComponent}
        </span>
      );
      if (!isSortable(metric)) {
        headerContent = (
          <EuiToolTip
            content={
              <FormattedMessage
                id="visTypeTimeseries.table.columnNotSortableTooltip"
                defaultMessage="This column is not sortable"
              />
            }
          >
            {headerContent}
          </EuiToolTip>
        );
      }

      return (
        <th onClick={handleClick} key={item.id} scope="col">
          {headerContent}
        </th>
      );
    });
    const label = model.pivot_label || model.pivot_field || model.pivot_id;
    let sortIcon;
    if (sort.column === '_default_') {
      sortIcon = sort.order === 'asc' ? 'sortUp' : 'sortDown';
    } else {
      sortIcon = 'empty';
    }
    const sortComponent = <EuiIcon type={sortIcon} />;
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
        <th className="eui-textLeft" scope="col" onClick={handleSortClick}>
          {label} {sortComponent}
        </th>
        {columns}
      </tr>
    );
  }

  render() {
    const { visData, model } = this.props;
    const header = this.renderHeader();
    let rows;

    if (isArray(visData.series) && visData.series.length) {
      rows = visData.series.map(this.renderRow);
    } else {
      const message = model.pivot_id ? (
        <FormattedMessage
          id="visTypeTimeseries.table.noResultsAvailableMessage"
          defaultMessage="No results available."
        />
      ) : (
        <FormattedMessage
          id="visTypeTimeseries.table.noResultsAvailableWithDescriptionMessage"
          defaultMessage="No results available. You must choose a group by field for this visualization."
        />
      );
      rows = (
        <tr>
          <td colSpan={this.visibleSeries.length + 1}>{message}</td>
        </tr>
      );
    }
    return (
      <div className="tvbVis" data-test-subj="tableView">
        <table className="table">
          <thead>{header}</thead>
          <tbody>{rows}</tbody>
        </table>
      </div>
    );
  }
}

TableVis.defaultProps = {
  sort: {},
};

TableVis.propTypes = {
  visData: PropTypes.object,
  model: PropTypes.object,
  backgroundColor: PropTypes.string,
  onPaginate: PropTypes.func,
  onUiState: PropTypes.func,
  uiState: PropTypes.object,
  pageNumber: PropTypes.number,
  getConfig: PropTypes.func,
};
