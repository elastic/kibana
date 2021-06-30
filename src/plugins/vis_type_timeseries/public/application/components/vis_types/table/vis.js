/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import _, { isArray, last, get } from 'lodash';
import React, { Component } from 'react';
import { parse as parseUrl } from 'url';
import PropTypes from 'prop-types';
import { RedirectAppLinks } from '../../../../../../kibana_react/public';
import { createTickFormatter } from '../../lib/tick_formatter';
import { isSortable } from './is_sortable';
import { EuiToolTip, EuiIcon } from '@elastic/eui';
import { replaceVars } from '../../lib/replace_vars';
import { fieldFormats } from '../../../../../../../plugins/data/public';
import { FormattedMessage } from '@kbn/i18n/react';
import { getFieldFormats, getCoreStart } from '../../../../services';
import { getValueOrEmpty } from '../../../../../common/empty_label';

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

function sanitizeUrl(url) {
  // eslint-disable-next-line no-script-url
  if (parseUrl(url).protocol === 'javascript:') {
    return '';
  }
  return url;
}

class TableVis extends Component {
  constructor(props) {
    super(props);

    const fieldFormatsService = getFieldFormats();
    const DateFormat = fieldFormatsService.getType(fieldFormats.FIELD_FORMAT_IDS.DATE);

    this.dateFormatter = new DateFormat({}, this.props.getConfig);
  }

  get visibleSeries() {
    return get(this.props, 'model.series', []).filter((series) => !series.hidden);
  }

  renderRow = (row) => {
    const { model } = this.props;
    let rowDisplay = model.pivot_type === 'date' ? this.dateFormatter.convert(row.key) : row.key;
    if (model.drilldown_url) {
      const url = replaceVars(model.drilldown_url, {}, { key: row.key });
      rowDisplay = <a href={sanitizeUrl(url)}>{rowDisplay}</a>;
    }
    const columns = row.series
      .filter((item) => item)
      .map((item) => {
        const column = this.visibleSeries.find((c) => c.id === item.id);
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
        <td>{getValueOrEmpty(rowDisplay)}</td>
        {columns}
      </tr>
    );
  };

  renderHeader() {
    const { model, uiState, onUiState, visData } = this.props;
    const stateKey = `${model.type}.sort`;
    const sort = uiState.get(stateKey, {
      column: '_default_',
      order: 'asc',
    });

    const calculateHeaderLabel = (metric, item) =>
      item.label || visData.series[0]?.series?.find((s) => item.id === s.id)?.label;

    const columns = this.visibleSeries.map((item) => {
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
    const label = visData.pivot_label || model.pivot_label || model.pivot_id;
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
      <RedirectAppLinks
        application={getCoreStart().application}
        className="tvbVis"
        data-test-subj="tableView"
      >
        <table className="table">
          <thead>{header}</thead>
          <tbody>{rows}</tbody>
        </table>
      </RedirectAppLinks>
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

// default export required for React.Lazy
// eslint-disable-next-line import/no-default-export
export { TableVis as default };
