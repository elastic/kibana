import _ from 'lodash';
import React, { Component, PropTypes } from 'react';
import ticFormatter from '../../lib/tick_formatter';
import calculateLabel from '../../../../common/calculate_label';

function getColor(rules, colorKey, value) {
  let color;
  if (rules) {
    rules.forEach((rule) => {
      if (rule.opperator && rule.value != null) {
        if (_[rule.opperator](value, rule.value)) {
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
    if (model.display_field) {
      rowDisplay = _.get(row, `${model.display_field}`, rowId);
    }
    // if (model.drilldown_dashboard) {
    //   let url = `#/dashboard/${model.drilldown_dashboard}`;
    //   url += `?_a=(query:(query_string:(query:'${model.id_field}:${rowId}')))`;
    //   rowDisplay = (<a href={url}>{rowDisplay}</a>);
    // }
    const columns = row.series.map(item => {
      const column = model.series.find(c => c.id === item.id);
      if (!column) return null;
      const formatter = ticFormatter(column.formatter, column.value_template);
      const value = formatter(item.last);
      let trend;
      if (column.trend_arrows) {
        const trendClass = item.slope > 0 ? 'fa-long-arrow-up' : 'fa-long-arrow-down';
        trend = (
          <span className="summarize__trend">
            <i className={`fa ${trendClass}`}></i>
          </span>
        );
      }
      const style = { color: getColor(column.color_rules, 'text', item.last) };
      return (
        <td key={`${rowId}-${item.id}`} className="summarize__value" style={style}>
          <span className="summarize__value-display">{ value }</span>
          {trend}
        </td>
      );
    });
    return (
      <tr key={rowId}>
        <td className="summarize__fieldName">{rowDisplay}</td>
        {columns}
      </tr>
    );
  }

  renderHeader() {
    const { model, uiState, onUiState } = this.props;
    const sort = uiState.get('sort', {
      column: '_default_',
      order: 'asc'
    });
    const columns  = model.series.map(item => {
      const metric = _.last(item.metrics);
      const label = item.label || calculateLabel(metric, item.metrics);
      const handleClick = () => {
        let order;
        if (sort.column === item.id) {
          order = sort.order === 'asc' ? 'desc' : 'asc';
        } else {
          order = 'asc';
        }
        onUiState('sort', { column: item.id, order });
      };
      let sortComponent;
      if (sort.column === item.id) {
        const sortIcon = sort.order === 'asc' ? 'sort-amount-asc' : 'sort-amount-desc';
        sortComponent = (
          <i className={`fa fa-${sortIcon}`}></i>
        );
      }
      return (
        <th
          className="summarize__columnName"
          onClick={handleClick}
          key={item.id}>{label} {sortComponent}</th>
      );
    });
    const label = model.pivot_label || model.pivot_field || model.pivot_id;
    const sortIcon = sort.order === 'asc' ? 'sort-amount-asc' : 'sort-amount-desc';
    let sortComponent;
    if (sort.column === '_default_') {
      sortComponent = (
        <i className={`fa fa-${sortIcon}`}></i>
      );
    }
    const handleSortClick = () => {
      let order;
      if (sort.column === '_default_') {
        order = sort.order === 'asc' ? 'desc' : 'asc';
      } else {
        order = 'asc';
      }
      onUiState('sort', { column: '_default_', order });
    };
    return (
      <tr>
        <th onClick={handleSortClick}>{label} {sortComponent}</th>
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

    if (_.isArray(visData.series)) {
      rows = visData.series.map(this.renderRow);
    } else {
      rows = (
        <tr>
          <td
            className="summarize__noResults"
            colSpan={model.series.length + 1}>No results available</td>
        </tr>
      );
    }
    return(
      <div className={`dashboard__visualization ${reversedClass}`}>
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
